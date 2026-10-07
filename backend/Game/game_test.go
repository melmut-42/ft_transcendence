package game

import (
	"errors"
	"testing"
)

func TestCheckInitialGameState(t *testing.T) {
	wpOriginal := "wordpack.json"
	wordPack := loadTestWordPack(t, wpOriginal)
	var seed [32]byte

	for testseed := byte(1); testseed < 200; testseed++ {
		seed[0] = testseed

		game, err := NewGameWithSeed(wordPack.Words, "en", seed)
		if err != nil {
			t.Fatalf("NewGameWithSeed returned an error: %v", err)
		}
		if game.currentTurn.Team != game.board.StartingTeam() {
			t.Errorf("CurrentTurn.Team (%v) does not match Board.StartingTeam() (%v)", game.currentTurn.Team, game.board.StartingTeam())
		}
		if game.currentTurn.Phase != PhaseWaitingForClue {
			t.Errorf("CurrentTurn.Phase is not PhaseWaitingForClue, got: %v", game.currentTurn.Phase)
		}
		if game.currentTurn.Clue != nil || game.currentTurn.GuessesRemaining != nil {
			t.Errorf("CurrentTurn Clue or GuessesRemaining are not nil, got: %v", game.currentTurn.Clue)
		}
		if game.winner != nil || game.endReason != nil {
			t.Errorf("Winner or EndReason are not nil, got: %v", game.winner)
		}
		if game.Score().Blue != 0 || game.Score().Red != 0 {
			t.Error("Team scores are not 0")
		}
	}
}

func TestScoreCalculation(t *testing.T) {
	wpOriginal := "wordpack.json"
	wordPack := loadTestWordPack(t, wpOriginal)
	seed := [32]byte{42}
	game, err := NewGameWithSeed(wordPack.Words, "en", seed)
	if err != nil {
		t.Fatalf("NewGameWithSeed returned an error: %v", err)
	}

	expectedRed, expectedBlue := 0, 0
	for i, card := range game.board.Cards() {
		if i < 9 {
			revealed, err := game.board.reveal(card.CardID)
			if err != nil {
				t.Fatalf("reveal returned an error: %v", err)
			}
			switch revealed.Color {
			case CardColorRed:
				expectedRed++
			case CardColorBlue:
				expectedBlue++
			}
		}
		if game.Score().Red != expectedRed || game.Score().Blue != expectedBlue {
			t.Errorf("wrong score: expected Red %d, Blue %d, got Red %d, Blue %d", expectedRed, expectedBlue, game.Score().Red, game.Score().Blue)
		}
	}
}

func TestValidateGameState(t *testing.T) {
	wpOriginal := "wordpack.json"
	wordPack := loadTestWordPack(t, wpOriginal)
	seed := [32]byte{42}
	game, err := NewGameWithSeed(wordPack.Words, "en", seed)
	if err != nil {
		t.Fatalf("NewGameWithSeed returned an error: %v", err)
	}

	err = game.ValidateGameState()
	if err != nil {
		t.Fatalf("ValidateGameState returned an error: %v", err)
	}
	team := game.board.StartingTeam()
	game.winner = &team
	err = game.ValidateGameState()
	if !errors.Is(err, ErrInvalidGameState) {
		t.Fatalf("ValidateGameState should have returned an error for winner set while in waiting for clue phase, but got: %v", err)
	}
}
