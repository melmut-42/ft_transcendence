package unit_test

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/melmut-42/ft_transcendence/backend/user-service/internal/service"
)

// recordingStore keeps the record it receives so tests can inspect it.
type recordingStore struct {
	records []service.ProvisionRecord
}

func (s *recordingStore) Provision(_ context.Context, record service.ProvisionRecord) (service.ProvisionResult, error) {
	s.records = append(s.records, record)
	return service.ProvisionResult{Created: true}, nil
}

// input builds a ProvisionInput with named fields.
func input(operation string, userID int64, username string, createdAt time.Time) service.ProvisionInput {
	return service.ProvisionInput{OperationID: operation, UserID: userID, Username: username, CreatedAt: createdAt}
}

const validOperation = "AAAAAAAA-1111-4111-8111-111111111111"

var validCreatedAt = time.Date(2026, 10, 1, 12, 0, 0, 123456789, time.FixedZone("x", 3*3600))

// TestProvisionValidation checks that bad payloads are refused before any storage call.
//
// Parameters:
//
//   - t: Go test runner used for subtests and assertions.
//
// Expected output:
//
//   - *ValidationError for a bad operation id, user id or created_at, naming each
//     field; ErrInvalidUsername for a bad username; the store is never called.
func TestProvisionValidation(t *testing.T) {
	tests := []struct {
		name       string
		in         service.ProvisionInput
		wantFields []string
		wantName   bool
	}{
		{"operation not a uuid", input("nope", 1, "alice", validCreatedAt), []string{"operation_id"}, false},
		{"zero user", input(validOperation, 0, "alice", validCreatedAt), []string{"user_id"}, false},
		{"negative user", input(validOperation, -3, "alice", validCreatedAt), []string{"user_id"}, false},
		{"missing created_at", input(validOperation, 1, "alice", time.Time{}), []string{"created_at"}, false},
		{"several bad fields", input("", 0, "alice", time.Time{}), []string{"operation_id", "user_id", "created_at"}, false},
		{"too short", input(validOperation, 1, "ab", validCreatedAt), nil, true},
		{"too long", input(validOperation, 1, strings.Repeat("a", 21), validCreatedAt), nil, true},
		{"bad characters", input(validOperation, 1, "bad name!", validCreatedAt), nil, true},
		{"blank", input(validOperation, 1, "   ", validCreatedAt), nil, true},
		{"non-ascii letter", input(validOperation, 1, "Ömer_42", validCreatedAt), nil, true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			store := &recordingStore{}
			_, err := service.NewProfile(store).Provision(context.Background(), tt.in)

			if len(store.records) != 0 {
				t.Fatal("store was called for an invalid payload")
			}
			if tt.wantName {
				if !errors.Is(err, service.ErrInvalidUsername) {
					t.Fatalf("error = %v, want ErrInvalidUsername", err)
				}
				return
			}
			var invalid *service.ValidationError
			if !errors.As(err, &invalid) {
				t.Fatalf("error = %v, want *ValidationError", err)
			}
			if len(invalid.Fields) != len(tt.wantFields) {
				t.Fatalf("fields = %v, want %v", invalid.Fields, tt.wantFields)
			}
			for _, name := range tt.wantFields {
				if _, ok := invalid.Fields[name]; !ok {
					t.Fatalf("fields = %v, missing %s", invalid.Fields, name)
				}
			}
		})
	}
}

// TestProvisionNormalizesAndFingerprints checks what reaches the store.
//
// Parameters:
//
//   - t: Go test runner used for assertions.
//
// Expected output:
//
//   - The username is trimmed, the operation id lowercased and the time put in UTC
//     at microsecond precision. The same payload always gives the same fingerprint
//     and changing the user, username or time changes it.
func TestProvisionNormalizesAndFingerprints(t *testing.T) {
	store := &recordingStore{}
	svc := service.NewProfile(store)
	provision := func(in service.ProvisionInput) service.ProvisionRecord {
		t.Helper()
		if _, err := svc.Provision(context.Background(), in); err != nil {
			t.Fatalf("Provision() error = %v", err)
		}
		return store.records[len(store.records)-1]
	}

	base := provision(input(validOperation, 7, "  Alice_1 ", validCreatedAt))
	if base.Username != "Alice_1" || base.OperationID != strings.ToLower(validOperation) {
		t.Fatalf("record = %+v, want trimmed username and lowercase operation id", base)
	}
	if base.CreatedAt.Location() != time.UTC || base.CreatedAt.Nanosecond()%1000 != 0 {
		t.Fatalf("created_at = %v, want UTC at microsecond precision", base.CreatedAt)
	}
	if len(base.Fingerprint) != 64 {
		t.Fatalf("fingerprint = %q, want 64 hex characters", base.Fingerprint)
	}

	if again := provision(input(validOperation, 7, "Alice_1", validCreatedAt)); again.Fingerprint != base.Fingerprint {
		t.Fatal("identical payload produced a different fingerprint")
	}
	for name, in := range map[string]service.ProvisionInput{
		"user":     input(validOperation, 8, "Alice_1", validCreatedAt),
		"username": input(validOperation, 7, "Alice_2", validCreatedAt),
		"time":     input(validOperation, 7, "Alice_1", validCreatedAt.Add(time.Second)),
	} {
		if provision(in).Fingerprint == base.Fingerprint {
			t.Fatalf("changing the %s did not change the fingerprint", name)
		}
	}
}
