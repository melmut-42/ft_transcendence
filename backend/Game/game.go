package game

type Player struct {
	UserID int
	Team   Team
	Role   Role
}

type Game struct {
	GameID      int
	Board       *Board
	Players     map[int]Player
	CurrentTurn CurrentTurn
	Winner      *Team
	EndReason   *EndReason
}