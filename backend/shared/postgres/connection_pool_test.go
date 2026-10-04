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

	"github.com/jackc/pgx/v5/pgxpool"
)

const testDSN = "postgres://test_user:private-password@127.0.0.1/test_db?sslmode=disable"

// TestPoolConfigDefaults checks connection and pool defaults without connecting.
//
// Parameters:
//
//   - t: Go test runner used for subtests, assertions and failure reporting.
//
// Inputs:
//
//   - Config containing only testDSN.
//
// Flow:
//
//  1. Call poolConfig and compare the generated settings.
//
// Expected output:
//
//   - nil error; connect timeout=5s, MaxConns>=4, MinConns=0, lifetime=1h and idle time=30m.
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

// TestPoolConfigOverrides checks DSN settings and explicit override precedence.
//
// Parameters:
//
//   - t: Go test runner used for subtests, assertions and failure reporting.
//
// Inputs:
//
//   - DSN pool settings: max=8, min=2, lifetime=2h and idle time=10m.
//   - An optional explicit override: timeout=2s, max=6, min=1, lifetime=1h and idle time=5m.
//
// Flow:
//
//  1. Build pool configuration for DSN-only and override cases.
//  2. Compare each timeout, size and lifetime against its case expectation.
//
// Expected output:
//
//   - DSN-only settings are retained with a 5s timeout.
//   - Nonzero Config fields override DSN values; both cases return nil errors.
func TestPoolConfigOverrides(t *testing.T) {
	tests := poolOverrideCases()

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

// TestOpenInvalidConfig checks validation errors and credential-safe messages.
//
// Parameters:
//
//   - t: Go test runner used for subtests, assertions and failure reporting.
//
// Inputs:
//
//   - Missing/blank/malformed DSNs; negative durations and pool counts; inconsistent bounds.
//   - Invalid DSN pool parameters including health interval, jitter and ping timeout.
//
// Flow:
//
//  1. Call Open with a background context for every invalid configuration.
//  2. Check the pool result, error classification and message.
//
// Expected output:
//
//   - Every case returns a nil pool and an error matching ErrInvalidConfig.
//   - Errors contain neither the test username nor the test password.
func TestOpenInvalidConfig(t *testing.T) {
	tests := invalidPoolCases()

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

// TestOpenContext checks already canceled or expired startup contexts.
//
// Parameters:
//
//   - t: Go test runner used for subtests, assertions and failure reporting.
//
// Inputs:
//
//   - An already canceled context and an already expired deadline, each with a valid testDSN.
//
// Flow:
//
//  1. Call Open with each context.
//  2. Check that no pool is returned and compare wrapped errors using errors.Is.
//
// Expected output:
//
//   - A nil pool and an error matching ErrConnect plus context.Canceled or
//     context.DeadlineExceeded.
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

// TestOpenTimeout checks bounded startup against an unresponsive TCP listener.
//
// Parameters:
//
//   - t: Go test runner used for subtests, assertions and failure reporting.
//
// Inputs:
//
//   - A local TCP listener that does not complete a PostgreSQL handshake.
//   - ConnectTimeout=50ms and MaxConns=1.
//
// Flow:
//
//  1. Start the listener, build its DSN and record the start time.
//  2. Call Open and inspect the result and elapsed time; close the listener afterward.
//
// Expected output:
//
//   - A nil pool and an error matching ErrConnect and context.DeadlineExceeded.
//   - The attempt completes within the test tolerance of 2 seconds.
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

// TestOpenUnavailable checks connection failures without exposing DSN credentials.
//
// Parameters:
//
//   - t: Go test runner used for subtests, assertions and failure reporting.
//
// Inputs:
//
//   - A PostgreSQL Unix-socket DSN pointing to an empty temporary directory.
//   - ConnectTimeout=1s with a test username and password.
//
// Flow:
//
//  1. Call Open against the absent server.
//  2. Check the returned pool, error class and error text.
//
// Expected output:
//
//   - A nil pool and an error matching ErrConnect.
//   - The error message includes neither the username nor the password.
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

// TestOpenPostgres checks real pool connectivity, lifetime and cleanup.
//
// Parameters:
//
//   - t: Go test runner used for subtests, assertions and failure reporting.
//
// Inputs:
//
//   - POSTGRES_TEST_DATABASE_URL and MaxConns=2.
//   - A cancelable startup context and a separate 5s query context.
//
// Flow:
//
//  1. Skip if the database URL is unset; otherwise Open the pool, then cancel the startup
//     context.
//  2. Run SELECT 1 using the fresh query context and inspect the pool maximum.
//  3. Close the pool and attempt to ping it again.
//
// Expected output:
//
//   - SELECT 1 returns integer 1 after startup cancellation; pool maximum is 2.
//   - Ping fails after Close; no application data is created or modified.
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

	checkPoolAfterStartup(t, pool)

	pool.Close()
	if err := pool.Ping(context.Background()); err == nil {
		t.Fatal("closed pool still accepts queries")
	}
}

type poolOverrideCase struct {
	name    string
	config  Config
	timeout time.Duration
	max     int32
	min     int32
	life    time.Duration
	idle    time.Duration
}

func poolOverrideCases() []poolOverrideCase {
	dsn := testDSN + "&pool_max_conns=8&pool_min_conns=2&pool_max_conn_lifetime=2h&pool_max_conn_idle_time=10m"
	return []poolOverrideCase{
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
}

type invalidPoolCase struct {
	name   string
	config Config
}

func invalidPoolCases() []invalidPoolCase {
	return []invalidPoolCase{
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
}

func checkPoolAfterStartup(t *testing.T, pool *pgxpool.Pool) {
	t.Helper()
	queryCtx, queryCancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer queryCancel()

	var value int
	if err := pool.QueryRow(queryCtx, "SELECT 1").Scan(&value); err != nil || value != 1 {
		t.Fatalf("pool is not usable after startup: value=%d err=%v", value, err)
	}

	if pool.Stat().MaxConns() != 2 {
		t.Fatal("pool did not apply the configured maximum")
	}
}
