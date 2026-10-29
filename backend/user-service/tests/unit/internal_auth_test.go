package unit_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/melmut-42/ft_transcendence/backend/user-service/internal/middleware/internalauth"
)

// TestInternalAuth checks which requests pass the internal token check.
//
// Parameters:
//
//   - t: Go test runner used for subtests and assertions.
//
// Expected output:
//
//   - Only the exact configured token reaches the handler; a missing, wrong or
//     partial token gets 401 UNAUTHORIZED, and an empty configured token lets nothing in.
func TestInternalAuth(t *testing.T) {
	const token = "a-long-enough-secret"
	tests := []struct {
		name       string
		configured string
		sent       string
		want       int
	}{
		{"correct token", token, token, http.StatusOK},
		{"missing token", token, "", http.StatusUnauthorized},
		{"wrong token", token, "another-long-secret", http.StatusUnauthorized},
		{"prefix of token", token, "a-long", http.StatusUnauthorized},
		{"empty configured token", "", "", http.StatusUnauthorized},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gin.SetMode(gin.TestMode)
			engine := gin.New()
			engine.GET("/x", internalauth.Middleware(tt.configured), func(c *gin.Context) { c.Status(http.StatusOK) })

			request := httptest.NewRequest(http.MethodGet, "/x", nil)
			if tt.sent != "" {
				request.Header.Set(internalauth.Header, tt.sent)
			}
			recorder := httptest.NewRecorder()
			engine.ServeHTTP(recorder, request)

			if recorder.Code != tt.want {
				t.Fatalf("status = %d, want %d", recorder.Code, tt.want)
			}
			if tt.want == http.StatusUnauthorized {
				errBody, _ := decode(t, recorder)["error"].(map[string]any)
				if errBody["code"] != "UNAUTHORIZED" {
					t.Fatalf("code = %v, want UNAUTHORIZED", errBody["code"])
				}
			}
		})
	}
}
