package game

import (
	"errors"
	"testing"
)

func TestGiveClue(t *testing.T) {
	game := &Game{
		board: &Board{},
		currentTurn: CurrentTurn{
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

func TestGiveClueErrors(t *testing.T) {
	game := &Game{
		board: &Board{},
		currentTurn: CurrentTurn{
			Team:  TeamRed,
			Phase: PhaseWaitingForClue,
		},
	}
	player := &Player{UserID: 1, Team: TeamRed, Role: RoleSpymaster}
	clue := &Clue{Word: "wrong clue", Number: 3}

	before := cloneTestGame(game)
	_, err := game.GiveClue(player, clue)
	if err == nil || !errors.Is(err, ErrInvalidClue) {
		t.Fatalf("expected ErrInvalidClue but got: %v", err)
	}
	checkGameUnchanged(t, before, game)

	clue = &Clue{Word: "exceeedlengththirtyexceeedlengththirty", Number: 3}
	before = cloneTestGame(game)
	_, err = game.GiveClue(player, clue)
	if err == nil || !errors.Is(err, ErrInvalidClue) {
		t.Fatalf("expected ErrInvalidClue but got: %v", err)
	}
	checkGameUnchanged(t, before, game)

	clue = &Clue{Word: "", Number: 3}
	before = cloneTestGame(game)
	_, err = game.GiveClue(player, clue)
	if err == nil || !errors.Is(err, ErrInvalidClue) {
		t.Fatalf("expected ErrInvalidClue but got: %v", err)
	}
	checkGameUnchanged(t, before, game)

	clue = &Clue{Word: "word", Number: 12}
	before = cloneTestGame(game)
	_, err = game.GiveClue(player, clue)
	if err == nil || !errors.Is(err, ErrInvalidClueNumber) {
		t.Fatalf("expected ErrInvalidClueNumber but got: %v", err)
	}
	checkGameUnchanged(t, before, game)

	game.board.cards[0].word = "existingword"
	clue = &Clue{Word: "ExistinGwOrd", Number: 3}
	before = cloneTestGame(game)
	_, err = game.GiveClue(player, clue)
	if err == nil || !errors.Is(err, ErrInvalidClue) {
		t.Fatalf("expected ErrInvalidClue but got: %v", err)
	}
	checkGameUnchanged(t, before, game)

	player = &Player{UserID: 2, Team: TeamBlue, Role: RoleSpymaster}
	before = cloneTestGame(game)
	_, err = game.GiveClue(player, clue)
	if err == nil || !errors.Is(err, ErrNotYourTurn) {
		t.Fatalf("expected ErrNotYourTurn but got: %v", err)
	}
	checkGameUnchanged(t, before, game)

	player = &Player{UserID: 1, Team: TeamRed, Role: RoleOperative}
	before = cloneTestGame(game)
	_, err = game.GiveClue(player, clue)
	if err == nil || !errors.Is(err, ErrRoleForbidden) {
		t.Fatalf("expected ErrRoleForbidden but got: %v", err)
	}
	checkGameUnchanged(t, before, game)
}
