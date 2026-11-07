package unit_test

import (
	"os"
	"path/filepath"
	"slices"
	"strings"
	"testing"

	"github.com/melmut-42/ft_transcendence/backend/auth-service/internal/config"
	"github.com/melmut-42/ft_transcendence/backend/auth-service/internal/testutil"
)

// writeSecret stores value in a temporary file and returns its path.
func writeSecret(t *testing.T, value string) string {
	t.Helper()
	path := filepath.Join(t.TempDir(), "credential")
	if err := os.WriteFile(path, []byte(value), 0o600); err != nil {
		t.Fatal(err)
	}

	return path
}

// TestInternalListenerConfig checks the private port and caller credential files.
//
// Expected output:
//
//   - INTERNAL_PORT defaults to 8090 and no caller is configured by default.
//   - Each caller's current and previous credentials are read and trimmed.
//   - Short credentials and one credential shared by two callers are rejected
//     without echoing the credential or its path.
func TestInternalListenerConfig(t *testing.T) {
	base := map[string]string{
		"APP_ENV": "test", "PORT": "", "INTERNAL_PORT": "", "DATABASE_URL": "postgres://test@localhost/test",
		"JWT_SECRET": testutil.TestSigningKey, "ACCESS_TOKEN_TTL": "", "REFRESH_TOKEN_TTL": "",
		"LOG_FORMAT": "", "LOG_LEVEL": "",
	}
	for _, caller := range []string{"WEB_BFF", "GAME_GATEWAY", "CHAT_GATEWAY", "USER_SERVICE"} {
		base[caller+"_CREDENTIAL_FILE"], base[caller+"_PREVIOUS_CREDENTIAL_FILE"] = "", ""
	}
	set := func(values map[string]string) {
		for key, value := range base {
			t.Setenv(key, value)
		}
		for key, value := range values {
			t.Setenv(key, value)
		}
	}

	set(nil)
	cfg, err := config.Load()
	if err != nil || cfg.InternalPort != "8090" || len(cfg.CallerCredentials) != 0 {
		t.Fatalf("defaults = %q, %d callers, %v", cfg.InternalPort, len(cfg.CallerCredentials), err)
	}

	bff, previous, user := strings.Repeat("b", 40), strings.Repeat("p", 40), strings.Repeat("u", 40)
	set(map[string]string{
		"WEB_BFF_CREDENTIAL_FILE":          writeSecret(t, bff+"\n"),
		"WEB_BFF_PREVIOUS_CREDENTIAL_FILE": writeSecret(t, previous),
		"USER_SERVICE_CREDENTIAL_FILE":     writeSecret(t, user),
	})
	cfg, err = config.Load()
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}
	if got := cfg.CallerCredentials["web-bff"]; len(got) != 2 || !slices.Contains(got, bff) || !slices.Contains(got, previous) {
		t.Fatalf("web-bff has %d credentials, want current and previous", len(got))
	}
	if got := cfg.CallerCredentials["user-service"]; len(got) != 1 || got[0] != user {
		t.Fatal("user-service credential not loaded")
	}

	for name, values := range map[string]map[string]string{
		"short":  {"USER_SERVICE_CREDENTIAL_FILE": writeSecret(t, "too-short-secret")},
		"shared": {"WEB_BFF_CREDENTIAL_FILE": writeSecret(t, bff), "GAME_GATEWAY_CREDENTIAL_FILE": writeSecret(t, bff)},
	} {
		t.Run(name, func(t *testing.T) {
			set(values)
			_, err := config.Load()
			if err == nil {
				t.Fatal("invalid credentials accepted")
			}
			if strings.Contains(err.Error(), "too-short-secret") || strings.Contains(err.Error(), bff) ||
				strings.Contains(err.Error(), os.TempDir()) {
				t.Fatalf("error %q leaks a credential or path", err)
			}
		})
	}
}
