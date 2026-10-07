package game

import (
	cryptorand "crypto/rand"
	"fmt"
	rand "math/rand/v2"
	"strings"
	"unicode/utf8"
)

type Game struct {
	GameID      int
	board       *Board
	currentTurn CurrentTurn
	winner      *Team
	endReason   *EndReason
}

func NewSecureSeed() ([32]byte, error) {
	var seed [32]byte
	_, err := cryptorand.Read(seed[:])
	if err != nil {
		return [32]byte{}, fmt.Errorf("%w: %v", ErrGenerateSeed, err)
	}
	return seed, nil
}

func NewGameWithSeed(wordPool []Word, language string, seed [32]byte) (*Game, error) {

	r := rand.New(rand.NewChaCha8(seed))

	board, err := NewBoard(wordPool, language, r)
	if err != nil {
		return nil, err
	}
	game := &Game{
		GameID: 0,
		board:  board,
		currentTurn: CurrentTurn{
			Team:             board.StartingTeam(),
			Phase:            PhaseWaitingForClue,
			Clue:             nil,
			GuessesRemaining: nil,
		},
		winner:    nil,
		endReason: nil,
	}

	return game, nil
}

func NewGame(wordPool []Word, language string) (*Game, error) {
	seed, err := NewSecureSeed()
	if err != nil {
		return nil, err
	}

	return NewGameWithSeed(wordPool, language, seed)
}

func (g *Game) Score() Score {
	redScore := 0
	blueScore := 0

	for _, card := range g.board.Cards() {
		if !card.Revealed {
			continue
		}
		switch card.Color {
		case CardColorRed:
			redScore++
		case CardColorBlue:
			blueScore++
		}
	}

	return Score{
		Red:  redScore,
		Blue: blueScore,
	}
}

func (g *Game) ValidateGameState() error {
	if g.board == nil {
		return ErrInvalidBoard
	}

	switch g.currentTurn.Phase {
	case PhaseWaitingForClue:
		if g.currentTurn.Clue != nil || g.currentTurn.GuessesRemaining != nil {
			return fmt.Errorf("%w: clue and guesses must be nil while waiting for clue", ErrInvalidGameState)
		}
		if g.winner != nil || g.endReason != nil {
			return fmt.Errorf("%w: winner and end reason must be nil while waiting for clue", ErrInvalidGameState)
		}
	case PhaseGuessing:
		if g.currentTurn.Clue == nil || g.currentTurn.GuessesRemaining == nil {
			return fmt.Errorf("%w: clue and guesses are required while guessing", ErrInvalidGameState)
		}
		if g.winner != nil || g.endReason != nil {
			return fmt.Errorf("%w: winner and end reason must be nil while guessing", ErrInvalidGameState)
		}
	case PhaseGameOver:
		if g.winner == nil {
			return fmt.Errorf("%w: winner is required when game is over", ErrInvalidWinner)
		}
		if g.endReason == nil {
			return fmt.Errorf("%w: end reason is required when game is over", ErrInvalidGameState)
		}
		if g.currentTurn.Clue != nil || g.currentTurn.GuessesRemaining != nil {
			return fmt.Errorf("%w: clue and guesses must be nil when game is over", ErrInvalidGameState)
		}
	default:
		return fmt.Errorf("%w: unknown phase %q", ErrInvalidGameState, g.currentTurn.Phase)
	}

	if g.winner != nil && *g.winner != TeamRed && *g.winner != TeamBlue {
		return ErrInvalidWinner
	}
	return nil
}

func validateTurnAction(g *Game, player *Player, phase Phase, role Role) error {
	if err := g.ValidateGameState(); err != nil {
		return err
	}
	if player == nil {
		return fmt.Errorf("%w: player is required", ErrInvalidArgument)
	}
	switch {
	case g.currentTurn.Phase == PhaseGameOver:
		return ErrGameAlreadyFinished
	case g.currentTurn.Phase != phase:
		return fmt.Errorf("%w: expected %q, got %q", ErrInvalidRoomState, phase, g.currentTurn.Phase)
	case player.Team != g.currentTurn.Team:
		return ErrNotYourTurn
	case player.Role != role:
		return ErrRoleForbidden
	}
	return nil
}

func validateClue(board *Board, clue *Clue) (Clue, error) {
	if clue == nil {
		return Clue{}, fmt.Errorf("%w: clue is required", ErrInvalidArgument)
	}
	word := strings.ToLower(strings.TrimSpace(clue.Word))
	if word == "" {
		return Clue{}, fmt.Errorf("%w: clue word cannot be empty", ErrInvalidClue)
	}
	if len(strings.Fields(word)) != 1 {
		return Clue{}, fmt.Errorf("%w: clue word cannot contain spaces", ErrInvalidClue)
	}
	if utf8.RuneCountInString(word) > 30 {
		return Clue{}, fmt.Errorf("%w: clue word cannot exceed 30 characters", ErrInvalidClue)
	}
	if clue.Number < 1 || clue.Number > 9 {
		return Clue{}, fmt.Errorf("%w: clue number must be between 1 and 9", ErrInvalidClueNumber)
	}
	for _, card := range board.Cards() {
		if !card.Revealed && strings.EqualFold(card.Word, word) {
			return Clue{}, fmt.Errorf("%w: %q is already on the board as unrevealed", ErrInvalidClue, word)
		}
	}
	return Clue{Word: word, Number: clue.Number}, nil
}

func (g *Game) GiveClue(player *Player, clue *Clue) (CurrentTurn, error) {
	if err := validateTurnAction(g, player, PhaseWaitingForClue, RoleSpymaster); err != nil {
		return CurrentTurn{}, err
	}
	cleaned, err := validateClue(g.board, clue)
	if err != nil {
		return CurrentTurn{}, err
	}

	guesses := clue.Number + 1
	g.currentTurn.Clue = &cleaned
	g.currentTurn.Phase = PhaseGuessing
	g.currentTurn.GuessesRemaining = &guesses

	return g.currentTurn.Clone(), nil
}

func (g *Game) finish(winner Team, reason EndReason) {
	g.currentTurn.Phase = PhaseGameOver
	g.currentTurn.Clue = nil
	g.currentTurn.GuessesRemaining = nil
	g.winner = &winner
	g.endReason = &reason
}

func opposite(t Team) Team {
	if t == TeamRed {
		return TeamBlue
	}
	return TeamRed
}

func (g *Game) switchTurn() {
	if g.currentTurn.Team == TeamRed {
		g.currentTurn.Team = TeamBlue
	} else {
		g.currentTurn.Team = TeamRed
	}
	g.currentTurn.Phase = PhaseWaitingForClue
	g.currentTurn.Clue = nil
	g.currentTurn.GuessesRemaining = nil
}

func handleTeamCard(g *Game, cardTeam Team) *ChangeReason {
	target := 8
	if g.board.startingTeam == cardTeam {
		target = 9
	}
	score := g.Score()
	revealed := score.Red
	if cardTeam == TeamBlue {
		revealed = score.Blue
	}
	if revealed >= target {
		g.finish(cardTeam, EndReasonAllTeamCardsRevealed)
		return nil
	}
	if g.currentTurn.Team != cardTeam {
		g.switchTurn()
		reason := ChangeReasonOpponentCardRevealed
		return &reason
	}
	*g.currentTurn.GuessesRemaining--
	if *g.currentTurn.GuessesRemaining <= 0 {
		g.switchTurn()
		reason := ChangeReasonGuessesExhausted
		return &reason
	}
	return nil
}

func handleCardColor(g *Game, card *Card) *ChangeReason {
	activeTeam := g.currentTurn.Team
	switch card.Color {
	case CardColorAssassin:
		g.finish(opposite(activeTeam), EndReasonAssassinRevealed)
	case CardColorNeutral:
		g.switchTurn()
		reason := ChangeReasonNeutralCardRevealed
		return &reason
	case CardColorRed:
		return handleTeamCard(g, TeamRed)
	case CardColorBlue:
		return handleTeamCard(g, TeamBlue)
	}
	return nil
}

func (g *Game) GuessCard(player *Player, cardID int) (GuessResult, error) {
	if err := validateTurnAction(g, player, PhaseGuessing, RoleOperative); err != nil {
		return GuessResult{}, err
	}
	if *g.currentTurn.GuessesRemaining <= 0 {
		return GuessResult{}, fmt.Errorf("%w: no guesses remaining", ErrNoGuessesRemaining)
	}
	card, err := g.board.reveal(cardID)
	if err != nil {
		return GuessResult{}, err
	}
	changeReason := handleCardColor(g, &card)

	var winner *Team
	if g.winner != nil {
		winnerCopy := *g.winner
		winner = &winnerCopy
	}
	var endReason *EndReason
	if g.endReason != nil {
		endReasonCopy := *g.endReason
		endReason = &endReasonCopy
	}

	return GuessResult{
		GameID:         g.GameID,
		Card:           newCardView(card),
		GuessingTeam:   player.Team,
		IsCorrectGuess: (player.Team == TeamRed && card.Color == CardColorRed) || (player.Team == TeamBlue && card.Color == CardColorBlue),
		Score:          g.Score(),
		CurrentTurn:    g.currentTurn.Clone(),
		ChangeReason:   changeReason,
		Winner:         winner,
		EndReason:      endReason,
	}, nil
}

func (g *Game) PassTurn(player *Player) error {
	if err := validateTurnAction(g, player, PhaseGuessing, RoleOperative); err != nil {
		return err
	}
	if *g.currentTurn.GuessesRemaining <= 0 {
		return ErrNoGuessesRemaining
	}
	g.switchTurn()
	return nil
}
