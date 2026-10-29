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

var (
	// ErrInvalidUsername reports a username outside 3 to 20 letters, digits and underscores.
	ErrInvalidUsername = errors.New("invalid username")
	// ErrUsernameTaken reports that another user already holds the username, ignoring case.
	ErrUsernameTaken = errors.New("username taken")
	// ErrOperationConflict reports that the operation or user was already provisioned
	// with a different payload, or that the stored result can no longer be replayed.
	ErrOperationConflict = errors.New("provisioning operation conflicts with an existing one")
)

var (
	usernamePattern  = regexp.MustCompile(`^[A-Za-z0-9_]{3,20}$`)
	operationPattern = regexp.MustCompile(`^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$`)
)

// ValidationError lists the request fields that failed validation, each with a public reason.
type ValidationError struct {
	Fields map[string]string
}

func (e *ValidationError) Error() string { return "invalid provisioning request" }

// ProvisionInput is the trusted payload Auth sends to create a profile.
type ProvisionInput struct {
	OperationID string
	UserID      int64
	Username    string
	CreatedAt   time.Time
}

// ProvisionRecord is a validated ProvisionInput ready for storage.
type ProvisionRecord struct {
	OperationID string
	UserID      int64
	Username    string
	CreatedAt   time.Time
	Fingerprint string
}

// Profile is the canonical profile as returned to Auth.
type Profile struct {
	UserID     int64
	Username   string
	AvatarKind string
	CreatedAt  time.Time
}

// ProvisionResult carries the profile and whether this call created it.
// Created is false when an identical earlier operation is being replayed.
type ProvisionResult struct {
	Profile Profile
	Created bool
}

// ProfileStore persists a provisioning operation and its profile atomically.
type ProfileStore interface {
	Provision(ctx context.Context, record ProvisionRecord) (ProvisionResult, error)
}

type ProfileService struct {
	store ProfileStore
}

// NewProfile returns a service provisioning profiles through store.
func NewProfile(store ProfileStore) *ProfileService {
	return &ProfileService{store: store}
}

// Provision validates the payload and creates the profile once per operation.
//
// Parameters:
//
//   - ctx: Controls the database work.
//   - in: Operation id (UUID), Auth-assigned positive user id, username and the
//     account creation time.
//
// Flow:
//
//  1. Validate every field. The username is trimmed first.
//  2. Fingerprint the payload so a retry can be compared with the first attempt.
//  3. Let the store create the operation record and profile in one transaction.
//
// It returns the profile and whether this call created it. An identical retry
// returns the same profile with Created false.
//
// Errors:
//
//   - *ValidationError: operation_id, user_id or created_at is invalid.
//   - ErrInvalidUsername: the username breaks the format rule.
//   - ErrUsernameTaken: the normalized username belongs to another user.
//   - ErrOperationConflict: the operation or user was provisioned with another payload.
//   - Database errors: the store failed; nothing was written.
func (s *ProfileService) Provision(ctx context.Context, in ProvisionInput) (ProvisionResult, error) {
	fields := map[string]string{}
	if !operationPattern.MatchString(in.OperationID) {
		fields["operation_id"] = "must be a UUID"
	}
	if in.UserID <= 0 {
		fields["user_id"] = "must be a positive integer"
	}
	if in.CreatedAt.IsZero() {
		fields["created_at"] = "is required"
	}
	if len(fields) > 0 {
		return ProvisionResult{}, &ValidationError{Fields: fields}
	}
	username := strings.TrimSpace(in.Username)
	if !usernamePattern.MatchString(username) {
		return ProvisionResult{}, ErrInvalidUsername
	}

	// PostgreSQL stores microseconds; truncating keeps a retry's fingerprint equal.
	createdAt := in.CreatedAt.UTC().Truncate(time.Microsecond)
	record := ProvisionRecord{
		OperationID: strings.ToLower(in.OperationID),
		UserID:      in.UserID,
		Username:    username,
		CreatedAt:   createdAt,
		Fingerprint: fingerprint(in.UserID, username, createdAt),
	}

	return s.store.Provision(ctx, record)
}

// fingerprint hashes the fields that define a provisioning payload.
func fingerprint(userID int64, username string, createdAt time.Time) string {
	sum := sha256.Sum256([]byte(fmt.Sprintf("%d\n%s\n%s", userID, username, createdAt.Format(time.RFC3339Nano))))

	return hex.EncodeToString(sum[:])
}
