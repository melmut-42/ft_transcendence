package postgres

import (
	"context"
	"errors"
	"fmt"
	"net"

	"github.com/jackc/pgx/v5/pgconn"
	"github.com/melmut-42/ft_transcendence/backend/auth-service/internal/service"
)

// classifyUnavailable marks connectivity failures with service.ErrUnavailable
// so callers can answer 503 instead of a domain verdict. Other errors pass through.
func classifyUnavailable(err error) error {
	if err == nil {
		return nil
	}
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		switch {
		case len(pgErr.Code) == 5 && pgErr.Code[:2] == "08", // connection exception
			pgErr.Code == "53300",                                               // too_many_connections
			pgErr.Code == "57P01", pgErr.Code == "57P02", pgErr.Code == "57P03": // shutdown, cannot connect now
			return fmt.Errorf("%w: %w", service.ErrUnavailable, err)
		}
		return err
	}
	var connectErr *pgconn.ConnectError
	var netErr net.Error
	if errors.As(err, &connectErr) || errors.As(err, &netErr) || pgconn.SafeToRetry(err) ||
		errors.Is(err, context.DeadlineExceeded) {
		return fmt.Errorf("%w: %w", service.ErrUnavailable, err)
	}

	return err
}
