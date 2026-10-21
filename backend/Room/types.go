package room

import (
	game "backend/Game"
	"time"
)

type Room struct {
	RoomID            int `gorm:"primaryKey;autoIncrement"`
	RoomCode          string
	Status            Status `gorm:"default:WAITING"`
	MaxPlayers        int    `gorm:"default:20"`
	HostUserID        *int   `gorm:"column:host_user_id"`
	TurnTimerSeconds  *TurnTimer
	CountdownEndsAt   *time.Time
	PostGameEndsAt    *time.Time
	StaffingDeadlines StaffingDeadlines `gorm:"embedded"`
	Language          string            `gorm:"default:en"`
	CreatedAt         time.Time
	RoomVersion       int
	EventSequence     int
}

type RoomMember struct {
	RoomID   int   `gorm:"autoIncrement:false"`
	UserID   int   `gorm:"primaryKey;autoIncrement:false"`
	State    State `gorm:"default:IN_LOBBY"`
	Team     *game.Team
	Role     *game.Role
	Ready    bool
	JoinedAt time.Time `gorm:"autoCreateTime"`
}

type Status string

const (
	StatusWaiting   Status = "WAITING"
	StatusCountDown Status = "COUNTDOWN"
	StatusInGame    Status = "IN_GAME"
	StatusPostGame  Status = "POST_GAME"
	StatusClosed    Status = "CLOSED"
)

type State string

const (
	StateInLobby  State = "IN_LOBBY"
	StateInGame   State = "IN_GAME"
	StatePostGame State = "POST_GAME"
)

type TurnTimer int

const (
	OneMinute        TurnTimer = 60
	OneAndHalfMinute TurnTimer = 90
	TwoMinute        TurnTimer = 120
)
