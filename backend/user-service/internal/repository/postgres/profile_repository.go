package postgres

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/melmut-42/ft_transcendence/backend/user-service/internal/service"
)

var _ service.ProfileStore = (*ProfileRepository)(nil)

const (
	codeUniqueViolation = "23505"
	usernameKey         = "profiles_username_key"
)

const selectProfile = "SELECT user_id, username, avatar_kind, created_at FROM profiles WHERE user_id = $1"

type ProfileRepository struct {
	pool *pgxpool.Pool
}

// NewProfile returns a profile store; pool ownership stays with the caller.
func NewProfile(pool *pgxpool.Pool) *ProfileRepository {
	return &ProfileRepository{pool: pool}
}

// Provision records the operation and creates the profile in one transaction.
//
// Parameters:
//
//   - ctx: Controls the transaction.
//   - record: Validated payload with its fingerprint.
//
// Flow:
//
//  1. Insert the operation as completed. A conflict on operation_id or user_id
//     means someone provisioned before, so go to step 3.
//  2. Insert the profile with the default avatar. If this fails the operation row
//     is rolled back with it, so a failure never leaves a username reserved.
//  3. Replay: the same operation_id with the same fingerprint returns the stored
//     profile unchanged; anything else is a conflict. Nothing is overwritten.
//
// Concurrent calls are safe: PostgreSQL's unique indexes make competing inserts
// wait for each other, so exactly one of them creates the profile.
//
// Errors:
//
//   - service.ErrUsernameTaken: the normalized username belongs to another user.
//   - service.ErrOperationConflict: see step 3, or the profile already exists
//     without this operation.
//   - Database errors: the transaction was rolled back.
func (r *ProfileRepository) Provision(ctx context.Context, record service.ProvisionRecord) (service.ProvisionResult, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return service.ProvisionResult{}, err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	tag, err := tx.Exec(ctx, `
		INSERT INTO provisioning_operations (operation_id, user_id, state, payload_fingerprint, completed_at)
		VALUES ($1, $2, 'completed', $3, now())
		ON CONFLICT DO NOTHING`,
		record.OperationID, record.UserID, record.Fingerprint)
	if err != nil {
		return service.ProvisionResult{}, err
	}
	if tag.RowsAffected() == 0 {
		return replay(ctx, tx, record)
	}

	var profile service.Profile
	err = tx.QueryRow(ctx, `
		INSERT INTO profiles (user_id, username, created_at)
		VALUES ($1, $2, $3)
		RETURNING user_id, username, avatar_kind, created_at`,
		record.UserID, record.Username, record.CreatedAt).
		Scan(&profile.UserID, &profile.Username, &profile.AvatarKind, &profile.CreatedAt)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == codeUniqueViolation {
			if pgErr.ConstraintName == usernameKey {
				return service.ProvisionResult{}, service.ErrUsernameTaken
			}
			// The user already has a profile that no operation of ours created.
			return service.ProvisionResult{}, service.ErrOperationConflict
		}
		return service.ProvisionResult{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return service.ProvisionResult{}, err
	}

	return service.ProvisionResult{Profile: profile, Created: true}, nil
}

// replay answers a repeated operation: the stored profile if the payload is the
// same, a conflict if it differs or the profile is gone.
func replay(ctx context.Context, tx pgx.Tx, record service.ProvisionRecord) (service.ProvisionResult, error) {
	var stored string
	err := tx.QueryRow(ctx,
		"SELECT payload_fingerprint FROM provisioning_operations WHERE operation_id = $1", record.OperationID).Scan(&stored)
	if errors.Is(err, pgx.ErrNoRows) {
		// The conflict was on user_id: another operation owns this user.
		return service.ProvisionResult{}, service.ErrOperationConflict
	}
	if err != nil {
		return service.ProvisionResult{}, err
	}
	if stored != record.Fingerprint {
		return service.ProvisionResult{}, service.ErrOperationConflict
	}

	var profile service.Profile
	err = tx.QueryRow(ctx, selectProfile, record.UserID).
		Scan(&profile.UserID, &profile.Username, &profile.AvatarKind, &profile.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		// A deleted profile must not be silently recreated by a late retry.
		return service.ProvisionResult{}, service.ErrOperationConflict
	}
	if err != nil {
		return service.ProvisionResult{}, err
	}

	return service.ProvisionResult{Profile: profile, Created: false}, nil
}
