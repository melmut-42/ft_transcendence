package controller

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/melmut-42/ft_transcendence/backend/shared/httpresponse"
	"github.com/melmut-42/ft_transcendence/backend/user-service/internal/middleware/internalauth"
	"github.com/melmut-42/ft_transcendence/backend/user-service/internal/router"
	"github.com/melmut-42/ft_transcendence/backend/user-service/internal/service"
)

const maxProvisionBody = 4 << 10

// ProfileProvisioner creates the profile for a new Auth account.
type ProfileProvisioner interface {
	Provision(ctx context.Context, in service.ProvisionInput) (service.ProvisionResult, error)
}

type InternalProfileController struct {
	profiles ProfileProvisioner
	token    string
}

// NewInternalProfile returns the controller for private profile operations.
// token is the shared secret internal callers must present.
func NewInternalProfile(profiles ProfileProvisioner, token string) *InternalProfileController {
	return &InternalProfileController{profiles: profiles, token: token}
}

// RegisterRoutes adds POST /internal/v1/profiles/provision behind the internal token.
//
// The path sits outside /api/v1 on purpose: the public reverse proxy forwards
// only /api and /ws prefixes, so this operation is reachable by internal callers only.
func (h *InternalProfileController) RegisterRoutes(routes gin.IRoutes) {
	routes.POST("/internal/v1/profiles/provision",
		internalauth.Middleware(h.token),
		router.Wrap(h.provision, mapProfileError))
}

type provisionRequest struct {
	OperationID string    `json:"operation_id"`
	UserID      int64     `json:"user_id"`
	Username    string    `json:"username"`
	CreatedAt   time.Time `json:"created_at"`
}

// provision creates the profile, or replays an identical earlier request.
// It answers 201 for a new profile and 200 for a replay, with the same body.
func (h *InternalProfileController) provision(c *gin.Context) error {
	var body provisionRequest
	decoder := json.NewDecoder(http.MaxBytesReader(c.Writer, c.Request.Body, maxProvisionBody))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&body); err != nil || decoder.Decode(&struct{}{}) != io.EOF {
		return router.ValidationError(map[string]string{
			"body": "must be one JSON object with operation_id, user_id, username and created_at",
		})
	}

	result, err := h.profiles.Provision(c.Request.Context(), service.ProvisionInput{
		OperationID: body.OperationID,
		UserID:      body.UserID,
		Username:    body.Username,
		CreatedAt:   body.CreatedAt,
	})
	if err != nil {
		return err
	}

	status := http.StatusOK
	if result.Created {
		status = http.StatusCreated
	}
	c.JSON(status, gin.H{"data": gin.H{
		"user_id":     result.Profile.UserID,
		"username":    result.Profile.Username,
		"avatar_kind": result.Profile.AvatarKind,
		"created_at":  result.Profile.CreatedAt.UTC().Format(time.RFC3339Nano),
	}})

	return nil
}

func mapProfileError(err error) *httpresponse.Error {
	var invalid *service.ValidationError
	switch {
	case errors.As(err, &invalid):
		return router.ValidationError(invalid.Fields)
	case errors.Is(err, service.ErrInvalidUsername):
		return &httpresponse.Error{Status: http.StatusUnprocessableEntity, Code: "INVALID_USERNAME",
			Message: "Username must be 3 to 20 letters, digits or underscores."}
	case errors.Is(err, service.ErrUsernameTaken):
		return &httpresponse.Error{Status: http.StatusConflict, Code: "USERNAME_TAKEN",
			Message: "That username is already taken."}
	case errors.Is(err, service.ErrOperationConflict):
		return &httpresponse.Error{Status: http.StatusConflict, Code: "OPERATION_CONFLICT",
			Message: "This operation or user was already provisioned with different data."}
	default:
		return httpresponse.InternalError()
	}
}
