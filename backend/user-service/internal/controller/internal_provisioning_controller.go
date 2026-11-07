package controller

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/melmut-42/ft_transcendence/backend/shared/httpresponse"
	"github.com/melmut-42/ft_transcendence/backend/user-service/internal/middleware/serviceauth"
	"github.com/melmut-42/ft_transcendence/backend/user-service/internal/router"
	"github.com/melmut-42/ft_transcendence/backend/user-service/internal/service"
)

const (
	maxProvisionBody   = 4 << 10
	provisioningPath   = "/internal/v1/provisioning-operations"
	receiptTimeLayout  = "2006-01-02T15:04:05.000000Z07:00"
	bodyValidationText = "Body must be one JSON object with user_id, username and created_at."
)

// Provisioner creates profiles for new Auth accounts and reads their receipts.
type Provisioner interface {
	Provision(ctx context.Context, in service.ProvisionInput) (service.ProvisionResult, error)
	ReceiptByOperation(ctx context.Context, operationID string) (service.Receipt, error)
	ReceiptByUser(ctx context.Context, userID int64) (service.Receipt, error)
}

type InternalProvisioningController struct {
	profiles Provisioner
	auth     *serviceauth.Authenticator
}

// NewInternalProvisioning returns the controller for private provisioning operations.
//
// Parameters:
//
//   - profiles: Provisioning rules.
//   - auth: Service authenticator enforcing each route's scope.
func NewInternalProvisioning(profiles Provisioner, auth *serviceauth.Authenticator) *InternalProvisioningController {
	return &InternalProvisioningController{profiles: profiles, auth: auth}
}

// RegisterRoutes adds the provisioning operations. Register them only on the
// private listener; the public listener never serves /internal routes.
func (h *InternalProvisioningController) RegisterRoutes(routes gin.IRoutes) {
	routes.PUT(provisioningPath+"/:operation_id",
		h.auth.Require(serviceauth.ScopeProfileProvision), router.Wrap(h.provision, mapProvisioningError))
	routes.GET(provisioningPath+"/:operation_id",
		h.auth.Require(serviceauth.ScopeProvisioningRead), router.Wrap(h.receiptByOperation, mapProvisioningError))
	routes.GET(provisioningPath,
		h.auth.Require(serviceauth.ScopeProvisioningRead), router.Wrap(h.receiptByUser, mapProvisioningError))
}

// provisionRequest uses pointers so a missing or null field is told apart from a zero value.
type provisionRequest struct {
	UserID    *int64  `json:"user_id"`
	Username  *string `json:"username"`
	CreatedAt *string `json:"created_at"`
}

// provision answers 201 with a new receipt, or 200 with the stored receipt for an identical replay.
func (h *InternalProvisioningController) provision(c *gin.Context) error {
	operationID, err := service.NormalizeOperationID(c.Param("operation_id"))
	if err != nil {
		return err
	}

	var body provisionRequest
	decoder := json.NewDecoder(http.MaxBytesReader(c.Writer, c.Request.Body, maxProvisionBody))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&body); err != nil || decoder.Decode(&struct{}{}) != io.EOF ||
		body.UserID == nil || body.Username == nil || body.CreatedAt == nil {
		return malformed("body", bodyValidationText)
	}
	createdAt, err := time.Parse(time.RFC3339Nano, *body.CreatedAt)
	if err != nil {
		return &service.ValidationError{Field: "created_at", Reason: "must be an ISO 8601 timestamp with offset"}
	}

	result, err := h.profiles.Provision(c.Request.Context(), service.ProvisionInput{
		OperationID: operationID,
		UserID:      *body.UserID,
		Username:    *body.Username,
		CreatedAt:   createdAt,
	})
	switch {
	case errors.Is(err, service.ErrOperationConflict):
		return conflict("OPERATION_CONFLICT", "This provisioning operation already exists with different data.",
			map[string]any{"operation_id": operationID})
	case errors.Is(err, service.ErrUserAlreadyProvisioned):
		return conflict("USER_ALREADY_PROVISIONED", "Another provisioning operation already owns this user.",
			map[string]any{"user_id": *body.UserID})
	case err != nil:
		return err
	}

	status := http.StatusOK
	if result.Created {
		status = http.StatusCreated
	}
	writeReceipt(c, status, result.Receipt)

	return nil
}

func (h *InternalProvisioningController) receiptByOperation(c *gin.Context) error {
	receipt, err := h.profiles.ReceiptByOperation(c.Request.Context(), c.Param("operation_id"))
	if err != nil {
		if errors.Is(err, service.ErrProvisioningNotFound) {
			return notFound(map[string]any{"operation_id": strings.ToLower(c.Param("operation_id"))})
		}
		return err
	}
	writeReceipt(c, http.StatusOK, receipt)

	return nil
}

func (h *InternalProvisioningController) receiptByUser(c *gin.Context) error {
	query := c.Request.URL.Query()
	for name := range query {
		if name != "user_id" {
			return malformed(name, "Only the user_id query parameter is allowed.")
		}
	}
	values, present := query["user_id"]
	if !present || len(values) != 1 || values[0] == "" {
		return malformed("user_id", "user_id is required exactly once.")
	}
	userID, err := strconv.ParseInt(values[0], 10, 64)
	if err != nil || userID <= 0 {
		return &service.ValidationError{Field: "user_id", Reason: "must be a positive integer"}
	}

	receipt, err := h.profiles.ReceiptByUser(c.Request.Context(), userID)
	if err != nil {
		if errors.Is(err, service.ErrProvisioningNotFound) {
			return notFound(map[string]any{"user_id": userID})
		}
		return err
	}
	writeReceipt(c, http.StatusOK, receipt)

	return nil
}

func writeReceipt(c *gin.Context, status int, receipt service.Receipt) {
	c.JSON(status, gin.H{"data": gin.H{
		"operation_id": receipt.OperationID,
		"user_id":      receipt.UserID,
		"outcome":      receipt.Outcome,
		"completed_at": receipt.CompletedAt.UTC().Format(receiptTimeLayout),
	}})
}

// malformed is the 400 VALIDATION_ERROR for a request whose shape is wrong.
func malformed(field, message string) *httpresponse.Error {
	return &httpresponse.Error{Status: http.StatusBadRequest, Code: "VALIDATION_ERROR", Message: message,
		Details: map[string]any{"field": field}}
}

func notFound(details map[string]any) *httpresponse.Error {
	return &httpresponse.Error{Status: http.StatusNotFound, Code: "PROVISIONING_NOT_FOUND",
		Message: "No provisioning operation was found.", Details: details}
}

func conflict(code, message string, details map[string]any) *httpresponse.Error {
	return &httpresponse.Error{Status: http.StatusConflict, Code: code, Message: message, Details: details}
}

// mapProvisioningError translates provisioning errors into the private contract's responses.
// Responses for errors without request context carry details the handler cannot add here.
func mapProvisioningError(err error) *httpresponse.Error {
	var invalid *service.ValidationError
	var deleted *service.UserDeletedError
	switch {
	case errors.As(err, &invalid):
		return &httpresponse.Error{Status: http.StatusUnprocessableEntity, Code: "VALIDATION_ERROR",
			Message: invalid.Field + " " + invalid.Reason + ".", Details: map[string]any{"field": invalid.Field}}
	case errors.As(err, &deleted):
		return conflict("USER_DELETED", "Account deletion is recorded for this user.",
			map[string]any{"user_id": deleted.UserID})
	case errors.Is(err, service.ErrInvalidUsername):
		return &httpresponse.Error{Status: http.StatusUnprocessableEntity, Code: "INVALID_USERNAME",
			Message: "Username must be 3 to 20 letters, digits or underscores.", Details: map[string]any{"field": "username"}}
	case errors.Is(err, service.ErrUsernameTaken):
		return conflict("USERNAME_TAKEN", "That username is already taken.", map[string]any{"field": "username"})
	case errors.Is(err, service.ErrUnavailable):
		return &httpresponse.Error{Status: http.StatusServiceUnavailable, Code: "SERVICE_UNAVAILABLE",
			Message: "The service is temporarily unavailable."}
	default:
		return httpresponse.InternalError()
	}
}
