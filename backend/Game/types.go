package game


type Team string

const (
	TeamRed  Team = "RED"
	TeamBlue Team = "BLUE"
)

type CardColor string

const (
	CardColorRed      CardColor = "RED"
	CardColorBlue     CardColor = "BLUE"
	CardColorNeutral  CardColor = "NEUTRAL"
	CardColorAssassin CardColor = "ASSASSIN"
)

type Role string

const (
	RoleSpymaster Role = "SPYMASTER"
	RoleOperative Role = "OPERATIVE"
)

type Phase string

const (
	PhaseWaitingForClue Phase = "WAITING_FOR_CLUE"
	PhaseGuessing       Phase = "GUESSING"
	PhaseGameOver       Phase = "GAME_OVER"
)

type EndReason string

const (
	EndReasonAllTeamCardsRevealed EndReason = "ALL_TEAM_CARDS_REVEALED"
	EndReasonAssassinRevealed     EndReason = "ASSASSIN_REVEALED"
	EndReasonPlayerForfeit        EndReason = "PLAYER_FORFEIT"
)

type Clue struct {
	Word   string `json:"word"`
	Number int    `json:"number"`
}

type Score struct {
	Red  int `json:"red"`
	Blue int `json:"blue"`
}

type CurrentTurn struct {
	Team             Team  `json:"team"`
	Phase            Phase `json:"phase"`
	Clue             *Clue `json:"clue"`
	GuessesRemaining *int  `json:"guesses_remaining"`
}

type GuessResult struct {
	GameID       int         `json:"game_id"`
	Card         Card        `json:"card"`
	GuessingTeam Team        `json:"guessing_team"`
	Score        Score       `json:"score"`
	CurrentTurn  CurrentTurn `json:"current_turn"`
	Winner       *Team       `json:"winner"`
	EndReason    *EndReason  `json:"end_reason"`
}

