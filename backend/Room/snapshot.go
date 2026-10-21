package room

import (
	game "backend/Game"
	"time"
)

type RoomSnapshot struct {
	RoomID           int                `json:"room_id"`
	RoomCode         string             `json:"room_code"`
	Status           Status             `json:"status"`
	HostUserID       *int               `json:"host_user_id"`
	PlayerCount      int                `json:"player_count"`
	MaxPlayers       int                `json:"max_players"`
	TurnTimerSeconds *TurnTimer         `json:"turn_timer_seconds"`
	Language         string             `json:"language"`
	Startable        bool               `json:"startable"`
	Countdown        *CountdownView     `json:"countdown,omitempty"`
	Players          []RoomMemberView   `json:"players"`
	Game             *game.GameSnapshot `json:"game"`
	CreatedAt        time.Time          `json:"created_at"`
	PostGame         *PostGameView      `json:"post_game,omitempty"`
	LastGame         *LastGameView      `json:"last_game,omitempty"`
	EmptySince       *time.Time         `json:"empty_since"`
	CloseAt          *time.Time         `json:"close_at"`
}

type RoomMemberView struct {
	UserID    int        `json:"user_id"`
	Username  string     `json:"username"`
	AvatarURL string     `json:"avatar_url"`
	Team      *game.Team `json:"team"`
	Role      *game.Role `json:"role"`
	Ready     bool       `json:"ready"`
	State     State      `json:"state"`
	IsHost    bool       `json:"is_host"`
	JoinedAt  time.Time  `json:"joined_at"`
}

func newRoomMemberView(member RoomMember, username, avatarURL string, hostUserID *int) RoomMemberView {
	var team *game.Team
	if member.Team != nil {
		teamCopy := *member.Team
		team = &teamCopy
	}
	var role *game.Role
	if member.Role != nil {
		roleCopy := *member.Role
		role = &roleCopy
	}
	return RoomMemberView{
		UserID:    member.UserID,
		Username:  username,
		AvatarURL: avatarURL,
		Team:      team,
		Role:      role,
		Ready:     member.Ready,
		State:     member.State,
		IsHost:    hostUserID != nil && member.UserID == *hostUserID,
		JoinedAt:  member.JoinedAt,
	}
}

func teamCheck(members []RoomMember) bool {
	redSpymasters := 0
	blueSpymasters := 0
	redOperatives := 0
	blueOperatives := 0

	for _, player := range members {
		if *player.Role == game.RoleSpymaster && *player.Team == game.TeamRed {
			redSpymasters++
		}
		if *player.Role == game.RoleOperative && *player.Team == game.TeamRed {
			redOperatives++
		}
		if *player.Role == game.RoleSpymaster && *player.Team == game.TeamBlue {
			blueSpymasters++
		}
		if *player.Role == game.RoleOperative && *player.Team == game.TeamBlue {
			blueOperatives++
		}
	}
	if redSpymasters != 1 || redOperatives < 1 ||
		blueSpymasters != 1 || blueOperatives < 1 {
		return false
	}
	return true
}

func (r *Room) IsStartableRoom(members []RoomMember) bool {
	if r.Status != StatusWaiting && r.Status != StatusCountDown {
		return false
	}
	if len(members) < 4 {
		return false
	}
	for _, player := range members {
		if player.Team == nil ||
			(*player.Team != game.TeamBlue && *player.Team != game.TeamRed) {
			return false
		}
		if player.Role == nil ||
			(*player.Role != game.RoleSpymaster && *player.Role != game.RoleOperative) {
			return false
		}
		if !player.Ready || player.State != StateInLobby {
			return false
		}
	}
	return teamCheck(members)
}

func (r *Room) SnapshotForRoom(
	members []RoomMember,
	currentGame *game.Game,
	userID int,
	countdown *CountdownView,
	lastGame *LastGameView,
	profiles map[int]RoomMemberView,
) (RoomSnapshot, error) {
	if r.Status == StatusClosed {
		return RoomSnapshot{}, ErrRoomNotFound
	}

	var player *RoomMember
	for i := range members {
		if members[i].UserID == userID &&
			members[i].RoomID == r.RoomID {
			player = &members[i]
			break
		}
	}
	if player == nil {
		return RoomSnapshot{}, ErrNotRoomMember
	}

	roomMembers := make([]RoomMember, 0, len(members))
	for _, member := range members {
		if member.RoomID == r.RoomID {
			roomMembers = append(roomMembers, member)
		}
	}

	for i := 1; i < len(roomMembers); i++ {
		member := roomMembers[i]
		j := i
		for j > 0 && (member.JoinedAt.Before(roomMembers[j-1].JoinedAt) ||
			(member.JoinedAt.Equal(roomMembers[j-1].JoinedAt) && member.UserID < roomMembers[j-1].UserID)) {
			roomMembers[j] = roomMembers[j-1]
			j--
		}
		roomMembers[j] = member
	}

	players := make([]RoomMemberView, 0, len(roomMembers))
	for _, member := range roomMembers {
		profile, ok := profiles[member.UserID]
		if !ok {
			return RoomSnapshot{}, ErrInvalidRoomState
		}
		players = append(players, newRoomMemberView(member, profile.Username, profile.AvatarURL, r.HostUserID))
	}

	var gameView *game.GameSnapshot
	var lastGameView *LastGameView
	switch player.State {
	case StateInGame, StatePostGame:
		if currentGame == nil {
			return RoomSnapshot{}, ErrInvalidRoomState
		}
		if err := currentGame.ValidateGameState(); err != nil {
			return RoomSnapshot{}, err
		}
		snapshot, err := currentGame.SnapshotForRole(player.Role)
		if err != nil {
			return RoomSnapshot{}, err
		}
		gameView = &snapshot
	case StateInLobby:
		if lastGame != nil {
			lastGameCopy := *lastGame
			lastGameView = &lastGameCopy
		}
	default:
		return RoomSnapshot{}, ErrInvalidRoomState
	}

	var hostUserID *int
	if r.HostUserID != nil {
		hostCopy := *r.HostUserID
		hostUserID = &hostCopy
	}
	var turnTimerSeconds *TurnTimer
	if r.TurnTimerSeconds != nil {
		timerCopy := *r.TurnTimerSeconds
		turnTimerSeconds = &timerCopy
	}
	var countdownView *CountdownView
	if r.Status == StatusCountDown && countdown != nil {
		countdownCopy := *countdown
		countdownView = &countdownCopy
	}
	return RoomSnapshot{
		RoomID:           r.RoomID,
		RoomCode:         r.RoomCode,
		Status:           r.Status,
		HostUserID:       hostUserID,
		PlayerCount:      len(roomMembers),
		MaxPlayers:       r.MaxPlayers,
		TurnTimerSeconds: turnTimerSeconds,
		Language:         r.Language,
		Startable:        r.IsStartableRoom(roomMembers),
		Countdown:        countdownView,
		Players:          players,
		Game:             gameView,
		CreatedAt:        r.CreatedAt,
		PostGame:         r.PostGame(roomMembers),
		LastGame:         lastGameView,
	}, nil
}
