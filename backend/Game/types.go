package game

type Team string

const (
	TeamRed  Team = "RED"
	TeamBlue Team = "BLUE"
)

type Player struct {
	UserID int
	Team   Team
	Role   Role
}

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

type CardView struct {
	CardID   int        `json:"card_id"`
	Word     string     `json:"word"`
	Color    *CardColor `json:"color"`
	Revealed bool       `json:"revealed"`
}

func newCardView(card Card) CardView {
	view := CardView{
		CardID:   card.CardID,
		Word:     card.Word,
		Revealed: card.Revealed,
	}
	if card.Revealed {
		c := card.Color
		view.Color = &c
	}
	return view
}

type GuessResult struct {
	GameID         int         `json:"game_id"`
	Card           CardView    `json:"card"`
	GuessingTeam   Team        `json:"guessing_team"`
	IsCorrectGuess bool        `json:"-"`
	Score          Score       `json:"score"`
	CurrentTurn    CurrentTurn `json:"current_turn"`
	Winner         *Team       `json:"winner"`
	EndReason      *EndReason  `json:"end_reason"`
}
