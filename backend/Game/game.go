package game

import (
	cryptorand "crypto/rand"
	"fmt"
	rand "math/rand/v2"
)

type Game struct {
	GameID      int
	Board       *Board
	CurrentTurn CurrentTurn
	Winner      *Team
	EndReason   *EndReason
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
		Board:  board,
		CurrentTurn: CurrentTurn{
			Team:             board.StartingTeam(),
			Phase:            PhaseWaitingForClue,
			Clue:             nil,
			GuessesRemaining: nil,
		},
		Winner:    nil,
		EndReason: nil,
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

	for _, card := range g.Board.Cards() {
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
	if g.Board == nil {
		return ErrInvalidBoard
	}

	switch g.CurrentTurn.Phase {
	case PhaseWaitingForClue:
		if g.CurrentTurn.Clue != nil || g.CurrentTurn.GuessesRemaining != nil {
			return fmt.Errorf("%w: clue and guesses must be nil while waiting for clue", ErrInvalidGameState)
		}
		if g.Winner != nil || g.EndReason != nil {
			return fmt.Errorf("%w: winner and end reason must be nil while waiting for clue", ErrInvalidGameState)
		}
	case PhaseGuessing:
		if g.CurrentTurn.Clue == nil || g.CurrentTurn.GuessesRemaining == nil {
			return fmt.Errorf("%w: clue and guesses are required while guessing", ErrInvalidGameState)
		}
		if g.Winner != nil || g.EndReason != nil {
			return fmt.Errorf("%w: winner and end reason must be nil while guessing", ErrInvalidGameState)
		}
	case PhaseGameOver:
		if g.Winner == nil {
			return fmt.Errorf("%w: winner is required when game is over", ErrInvalidWinner)
		}
		if g.EndReason == nil {
			return fmt.Errorf("%w: end reason is required when game is over", ErrInvalidGameState)
		}
		if g.CurrentTurn.Clue != nil || g.CurrentTurn.GuessesRemaining != nil {
			return fmt.Errorf("%w: clue and guesses must be nil when game is over", ErrInvalidGameState)
		}
	default:
		return fmt.Errorf("%w: unknown phase %q", ErrInvalidGameState, g.CurrentTurn.Phase)
	}

	if g.Winner != nil && *g.Winner != TeamRed && *g.Winner != TeamBlue {
		return ErrInvalidWinner
	}
	return nil
}
