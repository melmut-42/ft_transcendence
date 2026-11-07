package unit_test

import (
	"context"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/melmut-42/ft_transcendence/backend/user-service/internal/controller"
	"github.com/melmut-42/ft_transcendence/backend/user-service/internal/middleware/serviceauth"
	"github.com/melmut-42/ft_transcendence/backend/user-service/internal/server"
	"github.com/melmut-42/ft_transcendence/backend/user-service/internal/service"
)

// failingStore fails every call with err.
type failingStore struct{ err error }

func (s failingStore) Provision(context.Context, service.ProvisionRecord) (service.ProvisionResult, error) {
	return service.ProvisionResult{}, s.err
}

func (s failingStore) ReceiptByOperation(context.Context, string) (service.Receipt, error) {
	return service.Receipt{}, s.err
}

func (s failingStore) ReceiptByUser(context.Context, int64) (service.Receipt, error) {
	return service.Receipt{}, s.err
}

// TestProvisioningStoreFailures checks that store failures never become domain answers.
//
// Expected output:
//
//   - An unavailable database gives 503 SERVICE_UNAVAILABLE on every route.
//   - Any other failure gives 500 INTERNAL_ERROR with empty details and no cause.
func TestProvisioningStoreFailures(t *testing.T) {
	gin.SetMode(gin.TestMode)
	operation := "6b1f0c2e-9a4d-4c7e-8f3b-2d5e7a9c1b40"
	body := `{"user_id":42,"username":"player_one","created_at":"2026-11-05T09:30:00.123456Z"}`
	for _, tt := range []struct {
		name       string
		err        error
		wantStatus int
		wantCode   string
	}{
		{"unavailable", fmt.Errorf("%w: dial tcp: refused", service.ErrUnavailable), http.StatusServiceUnavailable, "SERVICE_UNAVAILABLE"},
		{"unexpected", fmt.Errorf("pq: secret internals"), http.StatusInternalServerError, "INTERNAL_ERROR"},
	} {
		auth := serviceauth.New(map[string][]string{"auth-service": {authCredential}}, serviceauth.DefaultMatrix())
		handler := server.NewInternal("0", slog.New(slog.NewTextHandler(io.Discard, nil)),
			controller.NewInternalProvisioning(service.NewProfile(failingStore{err: tt.err}), auth)).Handler
		for _, route := range []struct{ method, path, body string }{
			{http.MethodPut, "/internal/v1/provisioning-operations/" + operation, body},
			{http.MethodGet, "/internal/v1/provisioning-operations/" + operation, ""},
			{http.MethodGet, "/internal/v1/provisioning-operations?user_id=42", ""},
		} {
			t.Run(tt.name+" "+route.method+" "+route.path, func(t *testing.T) {
				request := httptest.NewRequest(route.method, route.path, strings.NewReader(route.body))
				request.Header.Set("Authorization", "Bearer "+authCredential)
				recorder := httptest.NewRecorder()
				handler.ServeHTTP(recorder, request)

				if recorder.Code != tt.wantStatus || !strings.Contains(recorder.Body.String(), `"code":"`+tt.wantCode+`"`) {
					t.Fatalf("got %d %s, want %d %s", recorder.Code, recorder.Body, tt.wantStatus, tt.wantCode)
				}
				if !strings.Contains(recorder.Body.String(), `"details":{}`) || strings.Contains(recorder.Body.String(), "secret") ||
					strings.Contains(recorder.Body.String(), "refused") {
					t.Fatalf("body %s leaks the cause or has non-empty details", recorder.Body)
				}
			})
		}
	}
}
