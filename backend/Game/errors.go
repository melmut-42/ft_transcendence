package game

import "errors"

var (
	ErrRoleForbidden       = errors.New("ROLE_FORBIDDEN")
	ErrNotYourTurn         = errors.New("NOT_YOUR_TURN")
	ErrInvalidRoomState    = errors.New("INVALID_ROOM_STATE")
	ErrInvalidCard         = errors.New("INVALID_CARD phase")
	ErrCardAlreadyRevealed = errors.New("CARD_ALREADY_REVEALED")
	ErrNoGuessesRemaining  = errors.New("NO_GUESSES_REMAINING")
	ErrGameAlreadyFinished = errors.New("GAME_ALREADY_FINISHED")
)
