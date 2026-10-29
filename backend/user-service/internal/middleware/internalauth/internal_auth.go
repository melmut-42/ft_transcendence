// Package internalauth restricts private service-to-service routes to trusted callers.
package internalauth

import (
	"crypto/sha256"
	"crypto/subtle"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/melmut-42/ft_transcendence/backend/shared/httpresponse"
	"github.com/melmut-42/ft_transcendence/backend/user-service/internal/router"
)

// Header carries the shared secret that internal callers present.
const Header = "X-Internal-Token"

// Middleware rejects every request that does not present the expected token.
//
// Parameters:
//
//   - token: Shared secret configured for internal callers. It must not be empty;
//     callers register internal routes only when a token is configured.
//
// It returns a Gin handler that lets matching requests continue and answers
// 401 UNAUTHORIZED otherwise. The comparison runs in constant time, so response
// timing does not reveal how much of a guess was right. Neither the expected
// nor the received token is ever logged or echoed.
func Middleware(token string) gin.HandlerFunc {
	expected := sha256.Sum256([]byte(token))

	return func(c *gin.Context) {
		received := sha256.Sum256([]byte(c.GetHeader(Header)))
		if token == "" || subtle.ConstantTimeCompare(expected[:], received[:]) != 1 {
			router.WriteError(c, &httpresponse.Error{
				Status:  http.StatusUnauthorized,
				Code:    "UNAUTHORIZED",
				Message: "Internal credentials are missing or invalid.",
			})
			return
		}
		c.Next()
	}
}
