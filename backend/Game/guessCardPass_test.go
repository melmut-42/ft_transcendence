package game

import (
	"errors"
	"testing"
)

func initGuessingTestGame(cardColor CardColor, clueNumber int, guessRemaining int) *Game {
	game := &Game{
		board: &Board{},
		currentTurn: CurrentTurn{
			Team:             TeamRed,
			Phase:            PhaseGuessing,
			Clue:             &Clue{Word: "clue", Number: clueNumber},
			GuessesRemaining: &guessRemaining,
		},
	}
	game.board.cards[8] = Card{CardID: 9, Word: "testpoint", Color: cardColor}
	game.board.reveal(9)
	game.board.cards[4] = Card{CardID: 5, Word: "target", Color: cardColor}
	return game
}

func TestGuessCard(t *testing.T) {
	game := initGuessingTestGame(CardColorRed, 2, 1)
	player := &Player{UserID: 1, Team: TeamRed, Role: RoleOperative}

	result, err := game.GuessCard(player, 5)
	if err != nil {
		t.Fatalf("GuessCard returned an error: %v", err)
	}
	if *result.Card.Color != CardColorRed || !result.Card.Revealed ||
		result.Card.CardID != 5 || result.Card.Word != "target" {
		t.Fatal("GuessCard-Cardview returned an error")
	}
	if result.GuessingTeam != player.Team || !result.IsCorrectGuess {
		t.Fatal("Score calculation returned an error")
	}
	if game.Score().Red != 2 {
		t.Fatal("Score calculation returned an error")
	}
	if result.ChangeReason == nil || *result.ChangeReason != ChangeReasonGuessesExhausted {
		t.Fatal("expected GUESSES_EXHAUSTED reason")
	}
	if result.CurrentTurn.Phase != PhaseWaitingForClue || result.CurrentTurn.Team != TeamBlue || result.CurrentTurn.GuessesRemaining != nil {
		t.Fatal("GuessCard - CurrentTurn and GuessRemaining returned an error")
	}
}

func TestGuessCardAssassinNeutral(t *testing.T) {
	game := initGuessingTestGame(CardColorAssassin, 2, 1)
	player := &Player{UserID: 1, Team: TeamRed, Role: RoleOperative}

	result, err := game.GuessCard(player, 5)
	if err != nil {
		t.Fatalf("Assassin: GuessCard returned an error: %v", err)
	}
	if result.ChangeReason != nil {
		t.Fatal("terminal result must not have a turn change reason")
	}
	if *result.EndReason != EndReasonAssassinRevealed || *result.Winner != TeamBlue || result.CurrentTurn.Phase != PhaseGameOver {
		t.Fatal("GuessCard - EndReason, Winner, Phase returned an error")
	}

	game = initGuessingTestGame(CardColorNeutral, 2, 1)
	result, err = game.GuessCard(player, 5)
	if err != nil {
		t.Fatalf("Neutral: GuessCard returned an error: %v", err)
	}
	if result.ChangeReason == nil || *result.ChangeReason != ChangeReasonNeutralCardRevealed {
		t.Fatal("expected NEUTRAL_CARD_REVEALED reason")
	}
	if result.CurrentTurn.Phase != PhaseWaitingForClue || result.CurrentTurn.Team != TeamBlue {
		t.Fatal("GuessCard - CurrentTeam returned an error")
	}
}

func TestPassTurn(t *testing.T) {
	game := initGuessingTestGame(CardColorBlue, 2, 2)
	player := &Player{UserID: 5, Team: TeamRed, Role: RoleOperative}

	err := game.PassTurn(player)
	if err != nil {
		t.Fatalf("PassTurn returned an error: %v", err)
	}
	if game.currentTurn.Team != TeamBlue || game.currentTurn.GuessesRemaining != nil || game.currentTurn.Phase != PhaseWaitingForClue || game.currentTurn.Clue != nil {
		t.Fatal("PassTurn func is not working correctly.")
	}

	game = initGuessingTestGame(CardColorBlue, 2, 2)
	player = &Player{UserID: 5, Team: TeamRed, Role: RoleOperative}
	*game.currentTurn.GuessesRemaining = 0
	err = game.PassTurn(player)
	if err == nil {
		t.Fatal("Expected an error, got none")
	}
	if !errors.Is(err, ErrNoGuessesRemaining) {
		t.Fatalf("Wrong error: expected %v, got %v", ErrNoGuessesRemaining, err)
	}

	game = initGuessingTestGame(CardColorBlue, 2, 2)
	player = &Player{UserID: 5, Team: TeamBlue, Role: RoleOperative}
	err = game.PassTurn(player)
	if err == nil {
		t.Fatal("Expected an error, got none")
	}
	if !errors.Is(err, ErrNotYourTurn) {
		t.Fatalf("Wrong error: expected %v, got %v", ErrNotYourTurn, err)
	}

}
