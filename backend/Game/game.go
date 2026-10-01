package game

import (
	cryptorand "crypto/rand"
	"fmt"
	rand "math/rand/v2"
)

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
		Board:   board,
		Players: make(map[int]Player),
		CurrentTurn: CurrentTurn{
			Team:  board.StartingTeam(),
			Phase: PhaseWaitingForClue},
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
