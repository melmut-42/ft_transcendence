package game

import (
	"errors"
	"testing"
)

func TestClueValidation(t *testing.T) {
	game := &Game{
		Board: &Board{},
		CurrentTurn: CurrentTurn{
			Team:  TeamRed,
			Phase: PhaseWaitingForClue,
		},
	}
	player := &Player{UserID: 1, Team: TeamRed, Role: RoleSpymaster}
	clue := &Clue{Word: "validclue", Number: 3}

	currTurn, err := game.GiveClue(player, clue)
	if err != nil {
		t.Fatalf("GiveClue returned an error: %v", err)
	}
	if currTurn.Phase != PhaseGuessing ||
		currTurn.Clue == nil ||
		currTurn.Clue.Word != clue.Word ||
		currTurn.Clue.Number != clue.Number ||
		currTurn.GuessesRemaining == nil ||
		*currTurn.GuessesRemaining != clue.Number+1 {
		t.Errorf("unexpected turn after GiveClue: %+v", currTurn)
	}
}

func TestClueValidationErrors(t *testing.T) {
	game := &Game{
		Board: &Board{},
		CurrentTurn: CurrentTurn{
			Team:  TeamRed,
			Phase: PhaseWaitingForClue,
		},
	}
	player := &Player{UserID: 1, Team: TeamRed, Role: RoleSpymaster}
	clue := &Clue{Word: "wrong clue", Number: 3}

	//validate clue
	_, err := game.GiveClue(player, clue)
	if err == nil || !errors.Is(err, ErrInvalidClue) {
		t.Fatalf("expected ErrInvalidClue but got: %v", err)
	}

	clue = &Clue{Word: "exceeedlengththirtyexceeedlengththirty", Number: 3}
	_, err = game.GiveClue(player, clue)
	if err == nil || !errors.Is(err, ErrInvalidClue) {
		t.Fatalf("expected ErrInvalidClue but got: %v", err)
	}

	clue = &Clue{Word: "", Number: 3}
	_, err = game.GiveClue(player, clue)
	if err == nil || !errors.Is(err, ErrInvalidClue) {
		t.Fatalf("expected ErrInvalidClue but got: %v", err)
	}

	clue = &Clue{Word: "word", Number: 12}
	_, err = game.GiveClue(player, clue)
	if err == nil || !errors.Is(err, ErrInvalidClueNumber) {
		t.Fatalf("expected ErrInvalidClueNumber but got: %v", err)
	}

	game.Board.cards[0].Word = "existingword"
	clue = &Clue{Word: "ExistinGwOrd", Number: 3}
	_, err = game.GiveClue(player, clue)
	if err == nil || !errors.Is(err, ErrInvalidClue) {
		t.Fatalf("expected ErrInvalidClue but got: %v", err)
	}

	//validate team
	player = &Player{UserID: 2, Team: TeamBlue, Role: RoleSpymaster}
	_, err = game.GiveClue(player, clue)
	if err == nil || !errors.Is(err, ErrNotYourTurn) {
		t.Fatalf("expected ErrNotYourTurn but got: %v", err)
	}
	player = &Player{UserID: 1, Team: TeamRed, Role: RoleOperative}
	_, err = game.GiveClue(player, clue)
	if err == nil || !errors.Is(err, ErrRoleForbidden) {
		t.Fatalf("expected ErrRoleForbidden but got: %v", err)
	}
}
