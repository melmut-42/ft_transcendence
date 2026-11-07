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
	"github.com/melmut-42/ft_transcendence/backend/user-service/internal/middleware/serviceauth"
	userpostgres "github.com/melmut-42/ft_transcendence/backend/user-service/internal/repository/postgres"
	"github.com/melmut-42/ft_transcendence/backend/user-service/internal/server"
	"github.com/melmut-42/ft_transcendence/backend/user-service/internal/service"
)

const (
	provisioningPath = "/internal/v1/provisioning-operations"
	accountCreated   = "2026-10-01T12:00:00.123456Z"
)

var (
	authCredential  = strings.Repeat("a", 40)
	otherCredential = strings.Repeat("o", 40)
)

// provisioningHandlers wires the real layers like cmd/server does.
//
// Parameters:
//
//   - t: Go test runner; Gin is put in test mode.
//   - pool: Pool used by the profile repository.
//
// Expected output:
//
//   - The private listener's handler, accepting auth-service with its contract
//     scopes and a second caller ("game-session") with no provisioning scope.
//   - The public listener's handler.
func provisioningHandlers(t *testing.T, pool *pgxpool.Pool) (internal, public http.Handler) {
	t.Helper()
	gin.SetMode(gin.TestMode)
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	matrix := serviceauth.DefaultMatrix()
	matrix["game-session"] = []string{"friend.verdict"}
	auth := serviceauth.New(map[string][]string{
		"auth-service": {authCredential},
		"game-session": {otherCredential},
	}, matrix)
	profiles := service.NewProfile(userpostgres.NewProfile(pool))
	internal = server.NewInternal("0", logger, controller.NewInternalProvisioning(profiles, auth)).Handler
	health := controller.NewHealth(service.NewHealth(userpostgres.NewHealth(pool)))
	public = server.New("0", health, logger).Handler

	return internal, public
}

// call sends one request with an optional service credential.
func call(handler http.Handler, method, path, credential, body string) *httptest.ResponseRecorder {
	request := httptest.NewRequest(method, path, strings.NewReader(body))
	if body != "" {
		request.Header.Set("Content-Type", "application/json")
	}
	if credential != "" {
		request.Header.Set("Authorization", "Bearer "+credential)
	}
	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, request)

	return recorder
}

// provision sends PUT for operation with Auth's credential.
func provision(handler http.Handler, operation, body string) *httptest.ResponseRecorder {
	return call(handler, http.MethodPut, provisioningPath+"/"+operation, authCredential, body)
}

// payload builds a provisioning request body.
func payload(userID int64, username string) string {
	return fmt.Sprintf(`{"user_id":%d,"username":%q,"created_at":%q}`, userID, username, accountCreated)
}

// opID returns a valid operation id that differs for each n.
func opID(n int) string { return fmt.Sprintf("00000000-0000-4000-8000-%012d", n) }

type errorBody struct {
	Error struct {
		Code    string         `json:"code"`
		Details map[string]any `json:"details"`
	} `json:"error"`
}

// decodeError extracts the error envelope from a response.
func decodeError(t *testing.T, recorder *httptest.ResponseRecorder) errorBody {
	t.Helper()
	var body errorBody
	if err := json.Unmarshal(recorder.Body.Bytes(), &body); err != nil {
		t.Fatalf("body %q is not JSON: %v", recorder.Body.String(), err)
	}

	return body
}

func errorCode(t *testing.T, recorder *httptest.ResponseRecorder) string {
	t.Helper()

	return decodeError(t, recorder).Error.Code
}

type receiptBody struct {
	Data struct {
		OperationID string `json:"operation_id"`
		UserID      int64  `json:"user_id"`
		Outcome     string `json:"outcome"`
		CompletedAt string `json:"completed_at"`
	} `json:"data"`
}

func decodeReceipt(t *testing.T, recorder *httptest.ResponseRecorder) receiptBody {
	t.Helper()
	var body receiptBody
	if err := json.Unmarshal(recorder.Body.Bytes(), &body); err != nil {
		t.Fatalf("body %q is not JSON: %v", recorder.Body.String(), err)
	}

	return body
}

// TestProvisionCreatesAndReplays checks creation, identical replay and the receipt reads.
//
// Expected output:
//
//   - The first call is 201 with the receipt (lowercase operation id, user id,
//     PROVISIONED, completed_at with microseconds) and stores one default-avatar profile.
//   - An identical retry, sent with an uppercase operation id, is 200 with the same body.
//   - Both receipt reads return the same body, even after the profile changes.
func TestProvisionCreatesAndReplays(t *testing.T) {
	pool := schemaPool(t)
	handler, _ := provisioningHandlers(t, pool)

	first := provision(handler, opID(1), payload(42, "Alice_1"))
	if first.Code != http.StatusCreated {
		t.Fatalf("first status = %d, body %s", first.Code, first.Body)
	}
	receipt := decodeReceipt(t, first).Data
	if receipt.OperationID != opID(1) || receipt.UserID != 42 || receipt.Outcome != "PROVISIONED" ||
		len(receipt.CompletedAt) != len("2026-11-05T09:30:00.245789Z") || !strings.HasSuffix(receipt.CompletedAt, "Z") {
		t.Fatalf("receipt = %+v", receipt)
	}
	if got := queryString(t, pool, "SELECT avatar_kind FROM profiles WHERE user_id = 42"); got != "default" {
		t.Fatalf("avatar_kind = %q, want default", got)
	}

	again := provision(handler, strings.ToUpper(opID(1)), payload(42, "Alice_1"))
	if again.Code != http.StatusOK || again.Body.String() != first.Body.String() {
		t.Fatalf("retry = %d %s, want 200 with the same body %s", again.Code, again.Body, first.Body)
	}

	mustExec(t, pool, "UPDATE profiles SET username = 'Renamed' WHERE user_id = 42")
	for _, path := range []string{provisioningPath + "/" + opID(1), provisioningPath + "?user_id=42"} {
		read := call(handler, http.MethodGet, path, authCredential, "")
		if read.Code != http.StatusOK || read.Body.String() != first.Body.String() {
			t.Fatalf("GET %s = %d %s, want 200 with the original receipt", path, read.Code, read.Body)
		}
	}
	if late := provision(handler, opID(1), payload(42, "Alice_1")); late.Code != http.StatusOK {
		t.Fatalf("replay after a profile change = %d %s, want 200", late.Code, late.Body)
	}
	if got := queryString(t, pool, "SELECT username FROM profiles WHERE user_id = 42"); got != "Renamed" {
		t.Fatalf("username = %q, a replay overwrote a later edit", got)
	}
	if got := count(t, pool, "SELECT count(*) FROM profiles"); got != 1 {
		t.Fatalf("%d profiles, want 1", got)
	}
}

// TestProvisionConflicts checks the contract's decision order for conflicting requests.
//
// Expected output:
//
//   - Same operation with another canonical request: 409 OPERATION_CONFLICT with operation_id.
//   - Another operation for the same user: 409 USER_ALREADY_PROVISIONED with user_id.
//   - Another user's username in any case or padding: 409 USERNAME_TAKEN.
//   - A profile created without an operation: USER_ALREADY_PROVISIONED.
//   - Nothing changes and no operation rows are left behind.
func TestProvisionConflicts(t *testing.T) {
	pool := schemaPool(t)
	handler, _ := provisioningHandlers(t, pool)
	if got := provision(handler, opID(1), payload(42, "Alice_1")).Code; got != http.StatusCreated {
		t.Fatalf("setup status = %d", got)
	}
	mustExec(t, pool, "INSERT INTO profiles (user_id, username, created_at) VALUES (77, 'Legacy', now())")

	tests := []struct {
		name        string
		operation   string
		body        string
		wantCode    string
		wantDetails string
	}{
		{"same operation, other username case", opID(1), payload(42, "ALICE_1"), "OPERATION_CONFLICT", `"operation_id":"` + opID(1) + `"`},
		{"same operation, other user", opID(1), payload(43, "Alice_1"), "OPERATION_CONFLICT", `"operation_id"`},
		{"same operation, other time", opID(1), strings.Replace(payload(42, "Alice_1"), "12:00:00", "13:00:00", 1), "OPERATION_CONFLICT", `"operation_id"`},
		{"other operation, same user", opID(2), payload(42, "Alice_1"), "USER_ALREADY_PROVISIONED", `"user_id":42`},
		{"other operation, same user, taken name", opID(2), payload(42, "Legacy"), "USER_ALREADY_PROVISIONED", `"user_id":42`},
		{"profile without operation", opID(6), payload(77, "Someone"), "USER_ALREADY_PROVISIONED", `"user_id":77`},
		{"username taken", opID(3), payload(50, "Alice_1"), "USERNAME_TAKEN", `"field":"username"`},
		{"username taken, other case", opID(4), payload(51, "ALICE_1"), "USERNAME_TAKEN", `"field":"username"`},
		{"username taken, padded", opID(5), payload(52, "  alice_1  "), "USERNAME_TAKEN", `"field":"username"`},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			response := provision(handler, tt.operation, tt.body)
			if response.Code != http.StatusConflict || errorCode(t, response) != tt.wantCode ||
				!strings.Contains(response.Body.String(), tt.wantDetails) {
				t.Fatalf("got %d %s, want 409 %s with %s", response.Code, response.Body, tt.wantCode, tt.wantDetails)
			}
		})
	}

	if got := queryString(t, pool, "SELECT username FROM profiles WHERE user_id = 42"); got != "Alice_1" {
		t.Fatalf("stored username = %q, want it untouched", got)
	}
	if got := count(t, pool, "SELECT count(*) FROM provisioning_operations"); got != 1 {
		t.Fatalf("%d operations after conflicts, want 1 (no leftovers)", got)
	}
}

// TestProvisionRespectsDeletion checks that a recorded deletion wins over everything else.
//
// Expected output:
//
//   - Replay, new provisioning and both receipt reads give 409 USER_DELETED with
//     user_id, and the deleted profile is never recreated.
func TestProvisionRespectsDeletion(t *testing.T) {
	pool := schemaPool(t)
	handler, _ := provisioningHandlers(t, pool)
	provision(handler, opID(1), payload(42, "Alice_1"))
	mustExec(t, pool, "DELETE FROM profiles WHERE user_id = 42")
	mustExec(t, pool, "INSERT INTO deletion_operations (operation_id, user_id) VALUES ('11111111-1111-4111-8111-111111111111', 42)")
	mustExec(t, pool, "INSERT INTO deletion_operations (operation_id, user_id) VALUES ('22222222-2222-4222-8222-222222222222', 60)")

	for _, tt := range []struct{ method, path, body string }{
		{http.MethodPut, provisioningPath + "/" + opID(1), payload(42, "Alice_1")},
		{http.MethodPut, provisioningPath + "/" + opID(9), payload(60, "Never_Made")},
		{http.MethodGet, provisioningPath + "/" + opID(1), ""},
		{http.MethodGet, provisioningPath + "?user_id=42", ""},
		{http.MethodGet, provisioningPath + "?user_id=60", ""},
	} {
		response := call(handler, tt.method, tt.path, authCredential, tt.body)
		if response.Code != http.StatusConflict || errorCode(t, response) != "USER_DELETED" ||
			!strings.Contains(response.Body.String(), `"user_id":`) {
			t.Fatalf("%s %s = %d %s, want 409 USER_DELETED", tt.method, tt.path, response.Code, response.Body)
		}
	}
	if got := count(t, pool, "SELECT count(*) FROM profiles"); got != 0 {
		t.Fatal("a request recreated a deleted profile")
	}
}

// TestProvisioningReceiptNotFound checks reads for unknown operations and users.
//
// Expected output:
//
//   - 404 PROVISIONING_NOT_FOUND with the lowercase operation_id or the user_id.
func TestProvisioningReceiptNotFound(t *testing.T) {
	pool := schemaPool(t)
	handler, _ := provisioningHandlers(t, pool)

	byOperation := call(handler, http.MethodGet, provisioningPath+"/"+strings.ToUpper(opID(5)), authCredential, "")
	if byOperation.Code != http.StatusNotFound || errorCode(t, byOperation) != "PROVISIONING_NOT_FOUND" ||
		decodeError(t, byOperation).Error.Details["operation_id"] != opID(5) {
		t.Fatalf("by operation = %d %s", byOperation.Code, byOperation.Body)
	}
	byUser := call(handler, http.MethodGet, provisioningPath+"?user_id=9999", authCredential, "")
	if byUser.Code != http.StatusNotFound || !strings.Contains(byUser.Body.String(), `"user_id":9999`) {
		t.Fatalf("by user = %d %s", byUser.Code, byUser.Body)
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
	handler, _ := provisioningHandlers(t, pool)
	provision(handler, opID(1), payload(1, "taken_name"))

	if got := provision(handler, opID(2), payload(2, "taken_name")).Code; got != http.StatusConflict {
		t.Fatalf("status = %d, want 409", got)
	}
	if got := count(t, pool, "SELECT count(*) FROM provisioning_operations WHERE user_id = 2"); got != 0 {
		t.Fatalf("%d leftover operation rows after a failure, want 0", got)
	}
	if got := provision(handler, opID(2), payload(2, "free_name")).Code; got != http.StatusCreated {
		t.Fatalf("redo status = %d, want 201", got)
	}
}

// TestProvisioningRejectsBadRequests checks access control and input validation.
//
// Expected output:
//
//   - 401 SERVICE_UNAUTHENTICATED without a valid credential and 403
//     SERVICE_FORBIDDEN for a caller without the scope, on every route.
//   - 400 VALIDATION_ERROR for malformed bodies, missing or unknown fields and
//     unknown query parameters; 422 VALIDATION_ERROR naming the field for bad
//     values; 422 INVALID_USERNAME for a bad username.
//   - The public listener does not serve /internal routes. Nothing is written.
func TestProvisioningRejectsBadRequests(t *testing.T) {
	pool := schemaPool(t)
	handler, public := provisioningHandlers(t, pool)
	good := payload(1, "valid_name")
	put := provisioningPath + "/" + opID(1)

	tests := []struct {
		name       string
		method     string
		path       string
		credential string
		body       string
		wantStatus int
		wantCode   string
		wantField  string
	}{
		{"no credential", http.MethodPut, put, "", good, http.StatusUnauthorized, "SERVICE_UNAUTHENTICATED", ""},
		{"wrong credential", http.MethodPut, put, strings.Repeat("x", 40), good, http.StatusUnauthorized, "SERVICE_UNAUTHENTICATED", ""},
		{"caller without scope, put", http.MethodPut, put, otherCredential, good, http.StatusForbidden, "SERVICE_FORBIDDEN", ""},
		{"caller without scope, read", http.MethodGet, put, otherCredential, "", http.StatusForbidden, "SERVICE_FORBIDDEN", ""},
		{"caller without scope, lookup", http.MethodGet, provisioningPath + "?user_id=1", otherCredential, "", http.StatusForbidden, "SERVICE_FORBIDDEN", ""},
		{"not json", http.MethodPut, put, authCredential, "{", http.StatusBadRequest, "VALIDATION_ERROR", "body"},
		{"array", http.MethodPut, put, authCredential, "[]", http.StatusBadRequest, "VALIDATION_ERROR", "body"},
		{"trailing data", http.MethodPut, put, authCredential, good + good, http.StatusBadRequest, "VALIDATION_ERROR", "body"},
		{"unknown field", http.MethodPut, put, authCredential, strings.Replace(good, "{", `{"avatar_url":"x",`, 1), http.StatusBadRequest, "VALIDATION_ERROR", "body"},
		{"operation id in body", http.MethodPut, put, authCredential, strings.Replace(good, "{", `{"operation_id":"`+opID(1)+`",`, 1), http.StatusBadRequest, "VALIDATION_ERROR", "body"},
		{"missing field", http.MethodPut, put, authCredential, `{"user_id":1,"username":"valid_name"}`, http.StatusBadRequest, "VALIDATION_ERROR", "body"},
		{"null field", http.MethodPut, put, authCredential, `{"user_id":1,"username":null,"created_at":"` + accountCreated + `"}`, http.StatusBadRequest, "VALIDATION_ERROR", "body"},
		{"bad operation id", http.MethodPut, provisioningPath + "/not-a-uuid", authCredential, good, http.StatusUnprocessableEntity, "VALIDATION_ERROR", "operation_id"},
		{"zero user", http.MethodPut, put, authCredential, payload(0, "valid_name"), http.StatusUnprocessableEntity, "VALIDATION_ERROR", "user_id"},
		{"bad time", http.MethodPut, put, authCredential, strings.Replace(good, accountCreated, "yesterday", 1), http.StatusUnprocessableEntity, "VALIDATION_ERROR", "created_at"},
		{"time without offset", http.MethodPut, put, authCredential, strings.Replace(good, accountCreated, "2026-10-01T12:00:00", 1), http.StatusUnprocessableEntity, "VALIDATION_ERROR", "created_at"},
		{"short username", http.MethodPut, put, authCredential, payload(1, "ab"), http.StatusUnprocessableEntity, "INVALID_USERNAME", "username"},
		{"username with space inside", http.MethodPut, put, authCredential, payload(1, "two words"), http.StatusUnprocessableEntity, "INVALID_USERNAME", "username"},
		{"read bad operation id", http.MethodGet, provisioningPath + "/123", authCredential, "", http.StatusUnprocessableEntity, "VALIDATION_ERROR", "operation_id"},
		{"lookup without user_id", http.MethodGet, provisioningPath, authCredential, "", http.StatusBadRequest, "VALIDATION_ERROR", "user_id"},
		{"lookup unknown parameter", http.MethodGet, provisioningPath + "?user_id=1&x=2", authCredential, "", http.StatusBadRequest, "VALIDATION_ERROR", "x"},
		{"lookup repeated user_id", http.MethodGet, provisioningPath + "?user_id=1&user_id=2", authCredential, "", http.StatusBadRequest, "VALIDATION_ERROR", "user_id"},
		{"lookup bad user_id", http.MethodGet, provisioningPath + "?user_id=zero", authCredential, "", http.StatusUnprocessableEntity, "VALIDATION_ERROR", "user_id"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			response := call(handler, tt.method, tt.path, tt.credential, tt.body)
			body := decodeError(t, response)
			if response.Code != tt.wantStatus || body.Error.Code != tt.wantCode {
				t.Fatalf("got %d %s, want %d %s", response.Code, response.Body, tt.wantStatus, tt.wantCode)
			}
			if tt.wantField != "" && body.Error.Details["field"] != tt.wantField {
				t.Fatalf("details = %v, want field %q", body.Error.Details, tt.wantField)
			}
			if tt.wantField == "" && len(body.Error.Details) != 0 {
				t.Fatalf("details = %v, want empty", body.Error.Details)
			}
		})
	}
	if got := count(t, pool, "SELECT count(*) FROM profiles"); got != 0 {
		t.Fatalf("%d profiles after rejected requests, want 0", got)
	}

	if got := call(public, http.MethodPut, put, authCredential, good).Code; got != http.StatusNotFound {
		t.Fatalf("public listener status = %d, want 404", got)
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
	handler, _ := provisioningHandlers(t, pool)
	const callers = 20

	responses := make([]*httptest.ResponseRecorder, callers)
	var wg sync.WaitGroup
	for i := range callers {
		wg.Add(1)
		go func() {
			defer wg.Done()
			name := []string{"Racer", "racer", "RACER", " racer "}[i%4]
			responses[i] = provision(handler, opID(100+i), payload(int64(100+i), name))
		}()
	}
	wg.Wait()

	created, taken := 0, 0
	for _, response := range responses {
		switch {
		case response.Code == http.StatusCreated:
			created++
		case response.Code == http.StatusConflict && errorCode(t, response) == "USERNAME_TAKEN":
			taken++
		default:
			t.Fatalf("unexpected response %d %s", response.Code, response.Body)
		}
	}
	if created != 1 || taken != callers-1 {
		t.Fatalf("created %d, taken %d, want 1 and %d", created, taken, callers-1)
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
	handler, _ := provisioningHandlers(t, pool)
	const callers = 10

	responses := make([]*httptest.ResponseRecorder, callers)
	var wg sync.WaitGroup
	for i := range callers {
		wg.Add(1)
		go func() {
			defer wg.Done()
			responses[i] = provision(handler, opID(1), payload(9, "Same_Call"))
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

// TestProvisionConcurrentOperationsForOneUser checks two different operations racing for one user.
//
// Expected output:
//
//   - Exactly one creates the profile; every other gets USER_ALREADY_PROVISIONED.
func TestProvisionConcurrentOperationsForOneUser(t *testing.T) {
	pool := schemaPool(t)
	handler, _ := provisioningHandlers(t, pool)
	const callers = 10

	responses := make([]*httptest.ResponseRecorder, callers)
	var wg sync.WaitGroup
	for i := range callers {
		wg.Add(1)
		go func() {
			defer wg.Done()
			responses[i] = provision(handler, opID(200+i), payload(7, fmt.Sprintf("name_%d", i)))
		}()
	}
	wg.Wait()

	created := 0
	for _, response := range responses {
		switch {
		case response.Code == http.StatusCreated:
			created++
		case response.Code == http.StatusConflict && errorCode(t, response) == "USER_ALREADY_PROVISIONED":
		default:
			t.Fatalf("unexpected response %d %s", response.Code, response.Body)
		}
	}
	if created != 1 || count(t, pool, "SELECT count(*) FROM provisioning_operations") != 1 {
		t.Fatalf("created %d, want exactly one operation and profile", created)
	}
}
