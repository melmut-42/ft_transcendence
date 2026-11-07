package model

import "time"

// Account status values. Only an ACTIVE account may hold a valid session.
const (
	AccountActive       = "ACTIVE"
	AccountProvisioning = "PROVISIONING"
	AccountDeleting     = "DELETING"
)

// User is a registered account. Email and username must be unique,
// case-insensitively; password hashing belongs to the service layer.
type User struct {
	ID           int64     `json:"user_id"`
	Email        string    `json:"email"`
	Username     string    `json:"username"`
	PasswordHash string    `json:"-"`
	Status       string    `json:"-"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"-"`
}
