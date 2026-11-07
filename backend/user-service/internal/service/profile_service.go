package service

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"regexp"
	"strings"
	"time"
)

// OutcomeProvisioned is the only receipt outcome: the operation created the profile.
const OutcomeProvisioned = "PROVISIONED"

var (
	// ErrInvalidUsername reports a username outside 3 to 20 letters, digits and underscores.
	ErrInvalidUsername = errors.New("invalid username")
	// ErrUsernameTaken reports that another user already holds the username, ignoring case.
	ErrUsernameTaken = errors.New("username taken")
	// ErrOperationConflict reports that operation_id exists with a different canonical request.
	ErrOperationConflict = errors.New("provisioning operation exists with a different request")
	// ErrUserAlreadyProvisioned reports that another operation or an existing profile owns user_id.
	ErrUserAlreadyProvisioned = errors.New("user already provisioned")
	// ErrProvisioningNotFound reports that no completed operation matches the lookup.
	ErrProvisioningNotFound = errors.New("provisioning operation not found")
	// ErrUnavailable reports that the database could not be reached; nothing was written.
	ErrUnavailable = errors.New("service dependency unavailable")
)

var (
	usernamePattern  = regexp.MustCompile(`^[A-Za-z0-9_]{3,20}$`)
	operationPattern = regexp.MustCompile(`^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$`)
)

// ValidationError names the first request field with an invalid value.
type ValidationError struct {
	Field  string
	Reason string
}

func (e *ValidationError) Error() string { return e.Field + " " + e.Reason }

// UserDeletedError reports that account deletion is recorded for UserID.
type UserDeletedError struct {
	UserID int64
}

func (e *UserDeletedError) Error() string { return "account deletion is recorded for this user" }

// ProvisionInput is the trusted request Auth sends to create a profile.
type ProvisionInput struct {
	OperationID string
	UserID      int64
	Username    string
	CreatedAt   time.Time
}

// ProvisionRecord is the canonical form of a ProvisionInput, ready for storage.
type ProvisionRecord struct {
	OperationID string
	UserID      int64
	Username    string
	CreatedAt   time.Time
	Fingerprint string
}

// Receipt is the immutable result of a completed provisioning operation. It is
// read from the operation record, never from the current profile.
type Receipt struct {
	OperationID string
	UserID      int64
	Outcome     string
	CompletedAt time.Time
}

// ProvisionResult carries the receipt and whether this call created the profile.
// Created is false when an identical earlier operation is being replayed.
type ProvisionResult struct {
	Receipt Receipt
	Created bool
}

// ProfileStore persists provisioning operations and their profiles.
type ProfileStore interface {
	Provision(ctx context.Context, record ProvisionRecord) (ProvisionResult, error)
	ReceiptByOperation(ctx context.Context, operationID string) (Receipt, error)
	ReceiptByUser(ctx context.Context, userID int64) (Receipt, error)
}

type ProfileService struct {
	store ProfileStore
}

// NewProfile returns a service provisioning profiles through store.
func NewProfile(store ProfileStore) *ProfileService {
	return &ProfileService{store: store}
}

// NormalizeOperationID validates a provisioning operation id and lowercases it.
//
// Errors:
//
//   - *ValidationError: the value is not a UUID.
func NormalizeOperationID(raw string) (string, error) {
	if !operationPattern.MatchString(raw) {
		return "", &ValidationError{Field: "operation_id", Reason: "must be a UUID"}
	}

	return strings.ToLower(raw), nil
}

// Provision creates the profile once per operation, or replays an identical one.
//
// Parameters:
//
//   - ctx: Controls the database work.
//   - in: Operation id (UUID), Auth-assigned positive user id, username and the
//     account creation time.
//
// Flow:
//
//  1. Validate every field. The username is trimmed and keeps its letter case.
//  2. Build the canonical request: lowercase operation id, created_at in UTC
//     truncated to microseconds, and a fingerprint of user_id, username and created_at.
//  3. Let the store apply the contract's decision order in one transaction.
//
// It returns the receipt and whether this call created the profile.
//
// Errors:
//
//   - *ValidationError: operation_id, user_id or created_at is invalid.
//   - ErrInvalidUsername: the username breaks the format rule.
//   - *UserDeletedError, ErrOperationConflict, ErrUserAlreadyProvisioned,
//     ErrUsernameTaken: see the store's decision order.
//   - ErrUnavailable or other errors: the store failed; nothing was written.
func (s *ProfileService) Provision(ctx context.Context, in ProvisionInput) (ProvisionResult, error) {
	operationID, err := NormalizeOperationID(in.OperationID)
	if err != nil {
		return ProvisionResult{}, err
	}
	if in.UserID <= 0 {
		return ProvisionResult{}, &ValidationError{Field: "user_id", Reason: "must be a positive integer"}
	}
	if in.CreatedAt.IsZero() {
		return ProvisionResult{}, &ValidationError{Field: "created_at", Reason: "must be an ISO 8601 timestamp with offset"}
	}
	username := strings.TrimSpace(in.Username)
	if !usernamePattern.MatchString(username) {
		return ProvisionResult{}, ErrInvalidUsername
	}

	// PostgreSQL stores microseconds; truncating keeps a retry's fingerprint equal.
	createdAt := in.CreatedAt.UTC().Truncate(time.Microsecond)

	return s.store.Provision(ctx, ProvisionRecord{
		OperationID: operationID,
		UserID:      in.UserID,
		Username:    username,
		CreatedAt:   createdAt,
		Fingerprint: fingerprint(in.UserID, username, createdAt),
	})
}

// ReceiptByOperation returns the receipt of one operation.
//
// Errors:
//
//   - *ValidationError: operationID is not a UUID.
//   - ErrProvisioningNotFound: no completed operation has this id.
//   - *UserDeletedError: account deletion is recorded for the operation's user.
//   - ErrUnavailable or other errors: the store failed.
func (s *ProfileService) ReceiptByOperation(ctx context.Context, operationID string) (Receipt, error) {
	normalized, err := NormalizeOperationID(operationID)
	if err != nil {
		return Receipt{}, err
	}

	return s.store.ReceiptByOperation(ctx, normalized)
}

// ReceiptByUser returns the receipt of the single operation of record for userID.
//
// Errors:
//
//   - *ValidationError: userID is not positive.
//   - *UserDeletedError: account deletion is recorded for userID.
//   - ErrProvisioningNotFound: no completed operation exists for userID.
//   - ErrUnavailable or other errors: the store failed.
func (s *ProfileService) ReceiptByUser(ctx context.Context, userID int64) (Receipt, error) {
	if userID <= 0 {
		return Receipt{}, &ValidationError{Field: "user_id", Reason: "must be a positive integer"}
	}

	return s.store.ReceiptByUser(ctx, userID)
}

// fingerprint hashes the fields that define the canonical provisioning request.
func fingerprint(userID int64, username string, createdAt time.Time) string {
	sum := sha256.Sum256([]byte(fmt.Sprintf("%d\n%s\n%s", userID, username, createdAt.Format(time.RFC3339Nano))))

	return hex.EncodeToString(sum[:])
}
