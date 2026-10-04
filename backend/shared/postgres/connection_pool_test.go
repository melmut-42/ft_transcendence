package postgres

import (
	"context"
	"errors"
	"fmt"
	"net"
	"os"
	"strings"
	"testing"
	"time"
)

const testDSN = "postgres://test_user:private-password@127.0.0.1/test_db?sslmode=disable"

// Defaults bound connection attempts while retaining pgx's pool defaults.
func TestPoolConfigDefaults(t *testing.T) {
	cfg, err := poolConfig(Config{DSN: testDSN})
	if err != nil {
		t.Fatal(err)
	}

	if cfg.ConnConfig.ConnectTimeout != 5*time.Second || cfg.MaxConns < 4 || cfg.MinConns != 0 ||
		cfg.MaxConnLifetime != time.Hour || cfg.MaxConnIdleTime != 30*time.Minute {
		t.Fatal("unexpected default pool settings")
	}
}

// DSN pool settings survive zero overrides; explicit settings take precedence.
func TestPoolConfigOverrides(t *testing.T) {
	dsn := testDSN + "&pool_max_conns=8&pool_min_conns=2&pool_max_conn_lifetime=2h&pool_max_conn_idle_time=10m"
	tests := []struct {
		name    string
		config  Config
		timeout time.Duration
		max     int32
		min     int32
		life    time.Duration
		idle    time.Duration
	}{
		{
			name: "DSN settings", config: Config{DSN: dsn},
			timeout: 5 * time.Second, max: 8, min: 2, life: 2 * time.Hour, idle: 10 * time.Minute,
		},
		{
			name: "explicit overrides", config: Config{
				DSN: dsn, ConnectTimeout: 2 * time.Second, MaxConns: 6, MinConns: 1,
				MaxConnLifetime: time.Hour, MaxConnIdleTime: 5 * time.Minute,
			},
			timeout: 2 * time.Second, max: 6, min: 1, life: time.Hour, idle: 5 * time.Minute,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cfg, err := poolConfig(tt.config)
			if err != nil {
				t.Fatal(err)
			}

			if cfg.ConnConfig.ConnectTimeout != tt.timeout || cfg.MaxConns != tt.max || cfg.MinConns != tt.min ||
				cfg.MaxConnLifetime != tt.life || cfg.MaxConnIdleTime != tt.idle {
				t.Fatal("pool settings did not respect configuration precedence")
			}
		})
	}
}

// Invalid settings fail before connecting and never expose connection credentials.
func TestOpenInvalidConfig(t *testing.T) {
	tests := []struct {
		name   string
		config Config
	}{
		{"missing DSN", Config{}},
		{"blank DSN", Config{DSN: "  "}},
		{"malformed DSN", Config{DSN: "postgres://test_user:private-password@localhost:invalid/db"}},
		{"negative timeout", Config{DSN: testDSN, ConnectTimeout: -time.Second}},
		{"negative maximum", Config{DSN: testDSN, MaxConns: -1}},
		{"negative minimum", Config{DSN: testDSN, MinConns: -1}},
		{"negative lifetime", Config{DSN: testDSN, MaxConnLifetime: -time.Second}},
		{"negative idle time", Config{DSN: testDSN, MaxConnIdleTime: -time.Second}},
		{"minimum exceeds maximum", Config{DSN: testDSN, MaxConns: 1, MinConns: 2}},
		{"DSN minimum exceeds override", Config{DSN: testDSN + "&pool_min_conns=3", MaxConns: 2}},
		{"DSN negative minimum", Config{DSN: testDSN + "&pool_min_conns=-1"}},
		{"DSN zero maximum", Config{DSN: testDSN + "&pool_max_conns=0"}},
		{"DSN negative idle minimum", Config{DSN: testDSN + "&pool_min_idle_conns=-1"}},
		{"DSN idle minimum exceeds maximum", Config{DSN: testDSN + "&pool_min_idle_conns=3", MaxConns: 2}},
		{"DSN zero lifetime", Config{DSN: testDSN + "&pool_max_conn_lifetime=0"}},
		{"DSN negative idle time", Config{DSN: testDSN + "&pool_max_conn_idle_time=-1s"}},
		{"DSN zero health interval", Config{DSN: testDSN + "&pool_health_check_period=0"}},
		{"DSN negative jitter", Config{DSN: testDSN + "&pool_max_conn_lifetime_jitter=-1s"}},
		{"DSN negative ping timeout", Config{DSN: testDSN + "&pool_ping_timeout=-1s"}},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			pool, err := Open(context.Background(), tt.config)
			if pool != nil {
				pool.Close()
				t.Fatal("invalid config returned a pool")
			}

			if !errors.Is(err, ErrInvalidConfig) {
				t.Fatalf("expected ErrInvalidConfig, got %v", err)
			}

			if strings.Contains(err.Error(), "private-password") || strings.Contains(err.Error(), "test_user") {
				t.Fatal("configuration error exposed credentials")
			}
		})
	}
}

// Canceled and expired callers receive matching context errors without a pool.
func TestOpenContext(t *testing.T) {
	canceled, cancel := context.WithCancel(context.Background())
	cancel()

	expired, release := context.WithDeadline(context.Background(), time.Now().Add(-time.Second))
	defer release()

	tests := []struct {
		name string
		ctx  context.Context
		want error
	}{
		{"canceled", canceled, context.Canceled},
		{"expired", expired, context.DeadlineExceeded},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			pool, err := Open(tt.ctx, Config{DSN: testDSN})
			if pool != nil {
				pool.Close()
				t.Fatal("canceled startup returned a pool")
			}

			if !errors.Is(err, ErrConnect) || !errors.Is(err, tt.want) {
				t.Fatalf("expected ErrConnect and %v, got %v", tt.want, err)
			}
		})
	}
}

// An unresponsive server cannot keep startup waiting beyond its configured deadline.
func TestOpenTimeout(t *testing.T) {
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	defer listener.Close()

	dsn := fmt.Sprintf("postgres://test_user:private-password@%s/test_db?sslmode=disable", listener.Addr())
	started := time.Now()
	pool, err := Open(context.Background(), Config{DSN: dsn, ConnectTimeout: 50 * time.Millisecond, MaxConns: 1})
	if pool != nil {
		pool.Close()
		t.Fatal("unresponsive server returned a pool")
	}

	if !errors.Is(err, ErrConnect) || !errors.Is(err, context.DeadlineExceeded) {
		t.Fatalf("expected connection timeout, got %v", err)
	}

	if time.Since(started) > 2*time.Second {
		t.Fatal("startup did not honor its connection timeout")
	}
}

// Failed connection attempts return safe errors rather than pgx connection details.
func TestOpenUnavailable(t *testing.T) {
	dsn := fmt.Sprintf("host=%s user=test_user password=private-password dbname=test_db sslmode=disable", t.TempDir())
	pool, err := Open(context.Background(), Config{DSN: dsn, ConnectTimeout: time.Second})
	if pool != nil {
		pool.Close()
		t.Fatal("missing server returned a pool")
	}

	if !errors.Is(err, ErrConnect) {
		t.Fatalf("expected ErrConnect, got %v", err)
	}

	if strings.Contains(err.Error(), "private-password") || strings.Contains(err.Error(), "test_user") {
		t.Fatal("connection error exposed credentials")
	}
}

// A real PostgreSQL pool remains usable after Open's startup context is canceled.
func TestOpenPostgres(t *testing.T) {
	dsn := os.Getenv("POSTGRES_TEST_DATABASE_URL")
	if dsn == "" {
		t.Skip("POSTGRES_TEST_DATABASE_URL is not set")
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	pool, err := Open(ctx, Config{DSN: dsn, MaxConns: 2})
	if err != nil {
		t.Fatal(err)
	}
	defer pool.Close()
	cancel()

	queryCtx, queryCancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer queryCancel()

	var value int
	if err := pool.QueryRow(queryCtx, "SELECT 1").Scan(&value); err != nil || value != 1 {
		t.Fatalf("pool is not usable after startup: value=%d err=%v", value, err)
	}

	if pool.Stat().MaxConns() != 2 {
		t.Fatal("pool did not apply the configured maximum")
	}

	pool.Close()
	if err := pool.Ping(queryCtx); err == nil {
		t.Fatal("closed pool still accepts queries")
	}
}
