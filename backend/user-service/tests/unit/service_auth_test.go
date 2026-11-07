package unit_test

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/melmut-42/ft_transcendence/backend/user-service/internal/middleware/serviceauth"
)

var (
	authCredential     = strings.Repeat("a", 40)
	authPrevious       = strings.Repeat("b", 40)
	gameCredential     = strings.Repeat("g", 40)
	unlistedCredential = strings.Repeat("u", 40)
)

// authRouter serves GET /op behind scope "profile.provision".
func authRouter(credentials map[string][]string) *gin.Engine {
	gin.SetMode(gin.TestMode)
	matrix := serviceauth.Matrix{
		"auth-service": {serviceauth.ScopeProfileProvision},
		"game-session": {"friend.verdict"},
	}
	engine := gin.New()
	engine.GET("/op", serviceauth.New(credentials, matrix).Require(serviceauth.ScopeProfileProvision),
		func(c *gin.Context) { c.String(http.StatusOK, serviceauth.Caller(c)) })

	return engine
}

// TestServiceAuth checks the private service credential rules.
//
// Expected output:
//
//   - The current and previous credential of a caller holding the scope pass and
//     expose that caller's identity.
//   - Missing, malformed or unknown credentials, and callers outside the matrix,
//     get 401 SERVICE_UNAUTHENTICATED with WWW-Authenticate: Bearer.
//   - A known caller without the scope gets 403 SERVICE_FORBIDDEN.
//   - No response echoes the presented credential.
//   - Without configured credentials every request is rejected.
func TestServiceAuth(t *testing.T) {
	engine := authRouter(map[string][]string{
		"auth-service": {authCredential, authPrevious},
		"game-session": {gameCredential},
		"unlisted":     {unlistedCredential},
	})
	tests := []struct {
		name       string
		header     string
		wantStatus int
		wantBody   string
	}{
		{"current credential", "Bearer " + authCredential, http.StatusOK, "auth-service"},
		{"previous credential", "Bearer " + authPrevious, http.StatusOK, "auth-service"},
		{"lowercase scheme", "bearer " + authCredential, http.StatusOK, "auth-service"},
		{"missing", "", http.StatusUnauthorized, "SERVICE_UNAUTHENTICATED"},
		{"other scheme", "Basic " + authCredential, http.StatusUnauthorized, "SERVICE_UNAUTHENTICATED"},
		{"no token", "Bearer ", http.StatusUnauthorized, "SERVICE_UNAUTHENTICATED"},
		{"extra part", "Bearer " + authCredential + " x", http.StatusUnauthorized, "SERVICE_UNAUTHENTICATED"},
		{"unknown", "Bearer " + strings.Repeat("z", 40), http.StatusUnauthorized, "SERVICE_UNAUTHENTICATED"},
		{"caller outside the matrix", "Bearer " + unlistedCredential, http.StatusUnauthorized, "SERVICE_UNAUTHENTICATED"},
		{"caller without the scope", "Bearer " + gameCredential, http.StatusForbidden, "SERVICE_FORBIDDEN"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			request := httptest.NewRequest(http.MethodGet, "/op", nil)
			if tt.header != "" {
				request.Header.Set("Authorization", tt.header)
			}
			recorder := httptest.NewRecorder()
			engine.ServeHTTP(recorder, request)

			if recorder.Code != tt.wantStatus || !strings.Contains(recorder.Body.String(), tt.wantBody) {
				t.Fatalf("got %d %s, want %d %s", recorder.Code, recorder.Body, tt.wantStatus, tt.wantBody)
			}
			if tt.wantStatus == http.StatusUnauthorized && recorder.Header().Get("WWW-Authenticate") != "Bearer" {
				t.Fatal("401 without WWW-Authenticate: Bearer")
			}
			if tt.wantStatus != http.StatusOK && tt.header != "" && strings.Contains(recorder.Body.String(), tt.header[strings.Index(tt.header, " ")+1:]) &&
				strings.TrimSpace(tt.header[strings.Index(tt.header, " ")+1:]) != "" {
				t.Fatal("response echoes the presented credential")
			}
		})
	}

	empty := authRouter(nil)
	request := httptest.NewRequest(http.MethodGet, "/op", nil)
	request.Header.Set("Authorization", "Bearer "+authCredential)
	recorder := httptest.NewRecorder()
	empty.ServeHTTP(recorder, request)
	if recorder.Code != http.StatusUnauthorized {
		t.Fatalf("empty configuration status = %d, want 401", recorder.Code)
	}
}
