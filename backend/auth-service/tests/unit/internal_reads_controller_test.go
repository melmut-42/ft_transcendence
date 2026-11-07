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
	"github.com/melmut-42/ft_transcendence/backend/auth-service/internal/controller"
	"github.com/melmut-42/ft_transcendence/backend/auth-service/internal/middleware/serviceauth"
	"github.com/melmut-42/ft_transcendence/backend/auth-service/internal/model"
	"github.com/melmut-42/ft_transcendence/backend/auth-service/internal/server"
	"github.com/melmut-42/ft_transcendence/backend/auth-service/internal/service"
)

// failingReader fails every read with err.
type failingReader struct{ err error }

func (r failingReader) Authenticate(context.Context, string) (service.Identity, error) {
	return service.Identity{}, r.err
}

func (r failingReader) AccountMetadata(context.Context, int64) (model.User, error) {
	return model.User{}, r.err
}

// TestInternalReadsDependencyFailures checks that failures never become user verdicts.
//
// Expected output:
//
//   - An unavailable database gives 503 SERVICE_UNAVAILABLE on both routes, not
//     401 UNAUTHORIZED or 404 USER_NOT_FOUND.
//   - Any other failure gives 500 INTERNAL_ERROR without its cause.
func TestInternalReadsDependencyFailures(t *testing.T) {
	gin.SetMode(gin.TestMode)
	bff, user := strings.Repeat("b", 40), strings.Repeat("u", 40)
	for _, tt := range []struct {
		name   string
		err    error
		status int
		code   string
	}{
		{"unavailable", fmt.Errorf("%w: dial tcp: refused", service.ErrUnavailable), http.StatusServiceUnavailable, "SERVICE_UNAVAILABLE"},
		{"unexpected", fmt.Errorf("secret internals"), http.StatusInternalServerError, "INTERNAL_ERROR"},
	} {
		auth := serviceauth.New(map[string][]string{"web-bff": {bff}, "user-service": {user}}, serviceauth.DefaultMatrix())
		handler := server.NewInternal("0", slog.New(slog.NewTextHandler(io.Discard, nil)),
			controller.NewInternalReads(failingReader{err: tt.err}, auth)).Handler
		for _, route := range []struct{ path, credential string }{
			{"/internal/v1/sessions/current", bff},
			{"/internal/v1/accounts/42", user},
		} {
			t.Run(tt.name+" "+route.path, func(t *testing.T) {
				request := httptest.NewRequest(http.MethodGet, route.path, nil)
				request.Header.Set("Authorization", "Bearer "+route.credential)
				request.AddCookie(&http.Cookie{Name: "ft_session", Value: "header.payload.signature"})
				recorder := httptest.NewRecorder()
				handler.ServeHTTP(recorder, request)

				body := recorder.Body.String()
				if recorder.Code != tt.status || !strings.Contains(body, `"code":"`+tt.code+`"`) ||
					!strings.Contains(body, `"details":{}`) || strings.Contains(body, "secret") || strings.Contains(body, "refused") {
					t.Fatalf("got %d %s, want %d %s", recorder.Code, body, tt.status, tt.code)
				}
			})
		}
	}
}
