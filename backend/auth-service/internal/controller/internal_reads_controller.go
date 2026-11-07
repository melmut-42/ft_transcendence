package controller

import (
	"context"
	"errors"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/melmut-42/ft_transcendence/backend/auth-service/internal/middleware/serviceauth"
	"github.com/melmut-42/ft_transcendence/backend/auth-service/internal/model"
	authrouter "github.com/melmut-42/ft_transcendence/backend/auth-service/internal/router"
	"github.com/melmut-42/ft_transcendence/backend/auth-service/internal/service"
	"github.com/melmut-42/ft_transcendence/backend/shared/httpresponse"
)

// InternalReader answers the private Auth reads.
type InternalReader interface {
	Authenticate(ctx context.Context, raw string) (service.Identity, error)
	AccountMetadata(ctx context.Context, userID int64) (model.User, error)
}

type InternalReadsController struct {
	reader InternalReader
	auth   *serviceauth.Authenticator
}

// NewInternalReads returns the controller for private session and account reads.
//
// Parameters:
//
//   - reader: Session verification and account lookup.
//   - auth: Service authenticator enforcing each route's scope.
func NewInternalReads(reader InternalReader, auth *serviceauth.Authenticator) *InternalReadsController {
	return &InternalReadsController{reader: reader, auth: auth}
}

// RegisterRoutes adds the private reads. Register them only on the private
// listener; the public listener never serves /internal routes.
func (h *InternalReadsController) RegisterRoutes(routes gin.IRoutes) {
	routes.GET("/internal/v1/sessions/current",
		h.auth.Require(serviceauth.ScopeSessionValidate), authrouter.Wrap(h.validateSession, mapInternalError))
	routes.GET("/internal/v1/accounts/:user_id",
		h.auth.Require(serviceauth.ScopeAccountMetadataRead), authrouter.Wrap(h.accountMetadata, mapInternalError))
}

// validateSession verifies the forwarded ft_session cookie against the active
// session and ACTIVE account. The caller's service credential never counts as
// a user credential.
func (h *InternalReadsController) validateSession(c *gin.Context) error {
	raw, err := c.Cookie("ft_session")
	if err != nil || raw == "" {
		return service.ErrUnauthorized
	}
	identity, err := h.reader.Authenticate(c.Request.Context(), raw)
	if err != nil {
		return err
	}
	c.JSON(http.StatusOK, gin.H{"data": gin.H{
		"user_id":            identity.User.ID,
		"session_id":         identity.SessionID,
		"session_expires_at": identity.ExpiresAt.UTC().Format(time.RFC3339Nano),
	}})

	return nil
}

// accountMetadata returns Auth-owned account metadata. Only user-service may
// call it, and it exposes the email only in the owner's private profile.
func (h *InternalReadsController) accountMetadata(c *gin.Context) error {
	userID, err := strconv.ParseInt(c.Param("user_id"), 10, 64)
	if err != nil || userID <= 0 {
		return &httpresponse.Error{Status: http.StatusUnprocessableEntity, Code: "VALIDATION_ERROR",
			Message: "user_id must be a positive integer.", Details: map[string]any{"field": "user_id"}}
	}
	account, err := h.reader.AccountMetadata(c.Request.Context(), userID)
	if errors.Is(err, service.ErrNotFound) {
		return &httpresponse.Error{Status: http.StatusNotFound, Code: "USER_NOT_FOUND",
			Message: "No account exists for this user.", Details: map[string]any{"user_id": userID}}
	}
	if err != nil {
		return err
	}
	c.JSON(http.StatusOK, gin.H{"data": gin.H{
		"user_id":    account.ID,
		"email":      account.Email,
		"status":     account.Status,
		"created_at": account.CreatedAt.UTC().Format(time.RFC3339Nano),
	}})

	return nil
}

// mapInternalError keeps dependency failures distinct from user verdicts.
func mapInternalError(err error) *httpresponse.Error {
	switch {
	case errors.Is(err, service.ErrUnauthorized):
		return &httpresponse.Error{Status: http.StatusUnauthorized, Code: "UNAUTHORIZED",
			Message: "A valid active session is required."}
	case errors.Is(err, service.ErrUnavailable):
		return &httpresponse.Error{Status: http.StatusServiceUnavailable, Code: "SERVICE_UNAVAILABLE",
			Message: "The service is temporarily unavailable."}
	default:
		return httpresponse.InternalError()
	}
}
