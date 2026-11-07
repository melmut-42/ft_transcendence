package service

import (
	"context"

	"github.com/melmut-42/ft_transcendence/backend/auth-service/internal/model"
)

// AccountMetadata returns the Auth-owned account record for userID.
//
// The record includes the login email; callers must expose it only to the
// account owner. The password hash stays inside Auth.
//
// Errors:
//
//   - ErrNotFound: no account exists for userID.
//   - ErrUnavailable: the database could not be reached.
//   - ErrSessionUnavailable: the repository cannot read accounts.
func (s *AuthService) AccountMetadata(ctx context.Context, userID int64) (model.User, error) {
	accounts, ok := s.repository.(AccountReader)
	if !ok {
		return model.User{}, ErrSessionUnavailable
	}

	return accounts.FindAccount(ctx, userID)
}
