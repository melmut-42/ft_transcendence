package integration_test

import (
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/melmut-42/ft_transcendence/backend/user-service/internal/controller"
	userpostgres "github.com/melmut-42/ft_transcendence/backend/user-service/internal/repository/postgres"
	"github.com/melmut-42/ft_transcendence/backend/user-service/internal/server"
	"github.com/melmut-42/ft_transcendence/backend/user-service/internal/service"
)

const (
	internalToken  = "test-internal-token-123"
	provisionPath  = "/internal/v1/profiles/provision"
	accountCreated = "2026-10-01T12:00:00.123456Z"
)

// provisionHandler wires the real layers with the internal routes enabled.
//
// Parameters:
//
//   - t: Go test runner; Gin is put in test mode.
//   - pool: Pool used by the profile repository.
//   - withInternal: false builds the server the way it runs without INTERNAL_API_TOKEN.
//
// Expected output:
//
//   - The server's handler, wired like cmd/server wires it.
func provisionHandler(t *testing.T, pool *pgxpool.Pool, withInternal bool) http.Handler {
	t.Helper()
	gin.SetMode(gin.TestMode)
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	health := controller.NewHealth(service.NewHealth(userpostgres.NewHealth(pool)))
	var extra []server.RouteRegistrar
	if withInternal {
		profiles := service.NewProfile(userpostgres.NewProfile(pool))
		extra = append(extra, controller.NewInternalProfile(profiles, internalToken))
	}

	return server.New("0", health, logger, extra...).Handler
}

// provision posts a payload with the given token and returns the recorded response.
func provision(handler http.Handler, token, body string) *httptest.ResponseRecorder {
	request := httptest.NewRequest(http.MethodPost, provisionPath, strings.NewReader(body))
	request.Header.Set("Content-Type", "application/json")
	if token != "" {
		request.Header.Set("X-Internal-Token", token)
	}
	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, request)

	return recorder
}

// payload builds a provisioning request body.
func payload(operation string, userID int64, username string) string {
	return fmt.Sprintf(`{"operation_id":%q,"user_id":%d,"username":%q,"created_at":%q}`,
		operation, userID, username, accountCreated)
}

// opID returns a valid operation id that differs for each n.
func opID(n int) string { return fmt.Sprintf("00000000-0000-4000-8000-%012d", n) }

// errorCode extracts error.code from a response.
func errorCode(t *testing.T, recorder *httptest.ResponseRecorder) string {
	t.Helper()
	var body struct {
		Error struct{ Code string } `json:"error"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &body); err != nil {
		t.Fatalf("body %q is not JSON: %v", recorder.Body.String(), err)
	}

	return body.Error.Code
}

// TestProvisionCreatesAndReplays checks the happy path and an identical retry.
//
// Expected output:
//
//   - The first call is 201 and stores one profile with the default avatar and the
//     account's created_at. An identical retry is 200 with the same body and adds
//     no rows.
func TestProvisionCreatesAndReplays(t *testing.T) {
	pool := schemaPool(t)
	handler := provisionHandler(t, pool, true)

	first := provision(handler, internalToken, payload(opID(1), 42, "Alice_1"))
	if first.Code != http.StatusCreated {
		t.Fatalf("first status = %d, body %s", first.Code, first.Body)
	}
	if !strings.Contains(first.Body.String(), `"avatar_kind":"default"`) || !strings.Contains(first.Body.String(), accountCreated) {
		t.Fatalf("body = %s, want default avatar and the account's created_at", first.Body)
	}

	again := provision(handler, internalToken, payload(opID(1), 42, "Alice_1"))
	if again.Code != http.StatusOK || again.Body.String() != first.Body.String() {
		t.Fatalf("retry = %d %s, want 200 with the same body %s", again.Code, again.Body, first.Body)
	}
	if got := count(t, pool, "SELECT count(*) FROM profiles"); got != 1 {
		t.Fatalf("%d profiles after a retry, want 1", got)
	}
	if got := count(t, pool, "SELECT count(*) FROM provisioning_operations WHERE state = 'completed'"); got != 1 {
		t.Fatalf("%d completed operations, want 1", got)
	}
}

// TestProvisionConflicts checks that conflicting requests fail and change nothing.
//
// Expected output:
//
//   - The same operation with another username or time, another operation for the
//     same user, and a missing profile on replay all give 409 OPERATION_CONFLICT.
//     A username used by someone else, in any case or with spaces, gives
//     409 USERNAME_TAKEN. The stored profile never changes.
func TestProvisionConflicts(t *testing.T) {
	pool := schemaPool(t)
	handler := provisionHandler(t, pool, true)
	if got := provision(handler, internalToken, payload(opID(1), 42, "Alice_1")).Code; got != http.StatusCreated {
		t.Fatalf("setup status = %d", got)
	}

	tests := []struct {
		name     string
		body     string
		wantCode string
	}{
		{"same operation, other username", payload(opID(1), 42, "Alice_2"), "OPERATION_CONFLICT"},
		{"same operation, other user", payload(opID(1), 43, "Alice_1"), "OPERATION_CONFLICT"},
		{"same operation, other time", strings.Replace(payload(opID(1), 42, "Alice_1"), "12:00:00", "13:00:00", 1), "OPERATION_CONFLICT"},
		{"other operation, same user", payload(opID(2), 42, "Alice_1"), "OPERATION_CONFLICT"},
		{"other operation, same user and new name", payload(opID(2), 42, "Brand_New"), "OPERATION_CONFLICT"},
		{"username taken", payload(opID(3), 50, "Alice_1"), "USERNAME_TAKEN"},
		{"username taken, other case", payload(opID(4), 51, "ALICE_1"), "USERNAME_TAKEN"},
		{"username taken, padded", payload(opID(5), 52, "  alice_1  "), "USERNAME_TAKEN"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			response := provision(handler, internalToken, tt.body)
			if response.Code != http.StatusConflict || errorCode(t, response) != tt.wantCode {
				t.Fatalf("got %d %s, want 409 %s", response.Code, response.Body, tt.wantCode)
			}
		})
	}

	if got := queryString(t, pool, "SELECT username FROM profiles WHERE user_id = 42"); got != "Alice_1" {
		t.Fatalf("stored username = %q, want it untouched", got)
	}
	if got := count(t, pool, "SELECT count(*) FROM profiles"); got != 1 {
		t.Fatalf("%d profiles after conflicts, want 1", got)
	}
	if got := count(t, pool, "SELECT count(*) FROM provisioning_operations"); got != 1 {
		t.Fatalf("%d operations after conflicts, want 1 (no leftovers)", got)
	}

	mustExec(t, pool, "DELETE FROM profiles WHERE user_id = 42")
	late := provision(handler, internalToken, payload(opID(1), 42, "Alice_1"))
	if late.Code != http.StatusConflict || errorCode(t, late) != "OPERATION_CONFLICT" {
		t.Fatalf("late retry after delete = %d %s, want 409 OPERATION_CONFLICT", late.Code, late.Body)
	}
	if got := count(t, pool, "SELECT count(*) FROM profiles"); got != 0 {
		t.Fatal("a late retry recreated a deleted profile")
	}
}

// TestProvisionLeavesNoOrphanReservation checks that a failed attempt can be redone.
//
// Expected output:
//
//   - After USERNAME_TAKEN the failed operation leaves no row, so the same
//     operation succeeds with a free username.
func TestProvisionLeavesNoOrphanReservation(t *testing.T) {
	pool := schemaPool(t)
	handler := provisionHandler(t, pool, true)
	provision(handler, internalToken, payload(opID(1), 1, "taken_name"))

	if got := provision(handler, internalToken, payload(opID(2), 2, "taken_name")).Code; got != http.StatusConflict {
		t.Fatalf("status = %d, want 409", got)
	}
	if got := count(t, pool, "SELECT count(*) FROM provisioning_operations WHERE user_id = 2"); got != 0 {
		t.Fatalf("%d leftover operation rows after a failure, want 0", got)
	}
	if got := provision(handler, internalToken, payload(opID(2), 2, "free_name")).Code; got != http.StatusCreated {
		t.Fatalf("redo status = %d, want 201", got)
	}
}

// TestProvisionRejectsBadRequests checks input validation and access control.
//
// Expected output:
//
//   - 401 without the right token, 400 VALIDATION_ERROR for malformed JSON, unknown
//     fields, bad ids and times, 422 INVALID_USERNAME for a bad username, and
//     nothing written. Without a configured token the route does not exist.
func TestProvisionRejectsBadRequests(t *testing.T) {
	pool := schemaPool(t)
	handler := provisionHandler(t, pool, true)
	good := payload(opID(1), 1, "valid_name")

	tests := []struct {
		name       string
		token      string
		body       string
		wantStatus int
		wantCode   string
	}{
		{"no token", "", good, http.StatusUnauthorized, "UNAUTHORIZED"},
		{"wrong token", "nope", good, http.StatusUnauthorized, "UNAUTHORIZED"},
		{"not json", internalToken, "{", http.StatusBadRequest, "VALIDATION_ERROR"},
		{"array", internalToken, "[]", http.StatusBadRequest, "VALIDATION_ERROR"},
		{"trailing data", internalToken, good + good, http.StatusBadRequest, "VALIDATION_ERROR"},
		{"unknown field", internalToken, strings.Replace(good, "{", `{"role":"admin",`, 1), http.StatusBadRequest, "VALIDATION_ERROR"},
		{"user id as string", internalToken, strings.Replace(good, `"user_id":1`, `"user_id":"1"`, 1), http.StatusBadRequest, "VALIDATION_ERROR"},
		{"bad time", internalToken, strings.Replace(good, accountCreated, "yesterday", 1), http.StatusBadRequest, "VALIDATION_ERROR"},
		{"zero user", internalToken, payload(opID(1), 0, "valid_name"), http.StatusBadRequest, "VALIDATION_ERROR"},
		{"bad operation", internalToken, payload("123", 1, "valid_name"), http.StatusBadRequest, "VALIDATION_ERROR"},
		{"short username", internalToken, payload(opID(1), 1, "ab"), http.StatusUnprocessableEntity, "INVALID_USERNAME"},
		{"username with space inside", internalToken, payload(opID(1), 1, "two words"), http.StatusUnprocessableEntity, "INVALID_USERNAME"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			response := provision(handler, tt.token, tt.body)
			if response.Code != tt.wantStatus || errorCode(t, response) != tt.wantCode {
				t.Fatalf("got %d %s, want %d %s", response.Code, response.Body, tt.wantStatus, tt.wantCode)
			}
		})
	}
	if got := count(t, pool, "SELECT count(*) FROM profiles"); got != 0 {
		t.Fatalf("%d profiles after rejected requests, want 0", got)
	}

	disabled := provisionHandler(t, pool, false)
	if got := provision(disabled, internalToken, good).Code; got != http.StatusNotFound {
		t.Fatalf("status without a configured token = %d, want 404", got)
	}
}

// TestProvisionConcurrentSameUsername checks the username race.
//
// Expected output:
//
//   - Twenty users register the same normalized username at once: exactly one gets
//     201, the other nineteen get 409 USERNAME_TAKEN, and one profile exists.
func TestProvisionConcurrentSameUsername(t *testing.T) {
	pool := schemaPool(t)
	handler := provisionHandler(t, pool, true)
	const callers = 20

	codes := make([]int, callers)
	var wg sync.WaitGroup
	for i := range callers {
		wg.Add(1)
		go func() {
			defer wg.Done()
			name := []string{"Racer", "racer", "RACER", " racer "}[i%4]
			codes[i] = provision(handler, internalToken, payload(opID(100+i), int64(100+i), name)).Code
		}()
	}
	wg.Wait()

	created, taken := 0, 0
	for _, code := range codes {
		switch code {
		case http.StatusCreated:
			created++
		case http.StatusConflict:
			taken++
		}
	}
	if created != 1 || taken != callers-1 {
		t.Fatalf("codes = %v, want exactly one 201 and %d 409", codes, callers-1)
	}
	if got := count(t, pool, "SELECT count(*) FROM profiles"); got != 1 {
		t.Fatalf("%d profiles, want 1", got)
	}
	if got := count(t, pool, "SELECT count(*) FROM provisioning_operations"); got != 1 {
		t.Fatalf("%d operations, want 1 (the losers must leave none)", got)
	}
}

// TestProvisionConcurrentIdenticalRetries checks simultaneous duplicate deliveries.
//
// Expected output:
//
//   - Ten identical requests at once all succeed with the same body; exactly one
//     is 201 and the rest 200; one profile and one operation exist.
func TestProvisionConcurrentIdenticalRetries(t *testing.T) {
	pool := schemaPool(t)
	handler := provisionHandler(t, pool, true)
	const callers = 10

	responses := make([]*httptest.ResponseRecorder, callers)
	var wg sync.WaitGroup
	for i := range callers {
		wg.Add(1)
		go func() {
			defer wg.Done()
			responses[i] = provision(handler, internalToken, payload(opID(1), 9, "Same_Call"))
		}()
	}
	wg.Wait()

	created := 0
	for _, response := range responses {
		if response.Code == http.StatusCreated {
			created++
		} else if response.Code != http.StatusOK {
			t.Fatalf("status = %d, body %s", response.Code, response.Body)
		}
		if response.Body.String() != responses[0].Body.String() {
			t.Fatalf("bodies differ: %s vs %s", response.Body, responses[0].Body)
		}
	}
	if created != 1 {
		t.Fatalf("%d responses were 201, want exactly 1", created)
	}
	if got := count(t, pool, "SELECT count(*) FROM profiles"); got != 1 {
		t.Fatalf("%d profiles, want 1", got)
	}
}
