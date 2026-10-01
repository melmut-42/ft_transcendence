package game

import "errors"

var (
	ErrRoleForbidden       = errors.New("ROLE_FORBIDDEN")
	ErrNotYourTurn         = errors.New("NOT_YOUR_TURN")
	ErrInvalidRoomState    = errors.New("INVALID_ROOM_STATE")
	ErrInvalidClue         = errors.New("INVALID_CLUE")
	ErrInvalidClueNumber   = errors.New("INVALID_CLUE_NUMBER")
	ErrInvalidCard         = errors.New("INVALID_CARD")
	ErrCardAlreadyRevealed = errors.New("CARD_ALREADY_REVEALED")
	ErrNoGuessesRemaining  = errors.New("NO_GUESSES_REMAINING")
	ErrGameAlreadyFinished = errors.New("GAME_ALREADY_FINISHED")
)

// Game-specific errors
var (
	ErrNotEnoughWords  = errors.New("not enough words in word pack")
	ErrInvalidWordPack = errors.New("invalid word pack")
	ErrInvalidBoard    = errors.New("invalid board")
	ErrNilRandomSource = errors.New("random source cannot be nil")
	ErrInvalidSeed     = errors.New("invalid seed")
	ErrGenerateSeed    = errors.New("failed to generate secure seed")
)
