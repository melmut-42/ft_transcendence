package game

import (
	"testing"
)

func initGuessingTestGame(cardColor CardColor, clueNumber int, guessRemaining int) *Game {
	game := &Game{
		Board: &Board{},
		CurrentTurn: CurrentTurn{
			Team:             TeamRed,
			Phase:            PhaseGuessing,
			Clue:             &Clue{Word: "clue", Number: clueNumber},
			GuessesRemaining: &guessRemaining,
		},
	}
	game.Board.cards[8] = Card{CardID: 9, Word: "testpoint", Color: cardColor}
	game.Board.reveal(9)
	game.Board.cards[4] = Card{CardID: 5, Word: "target", Color: cardColor}
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
	if *result.EndReason != EndReasonAssassinRevealed || *result.Winner != TeamBlue || result.CurrentTurn.Phase != PhaseGameOver {
		t.Fatal("GuessCard - EndReason, Winner, Phase returned an error")
	}

	game = initGuessingTestGame(CardColorNeutral, 2, 1)
	result, err = game.GuessCard(player, 5)
	if err != nil {
		t.Fatalf("Neutral: GuessCard returned an error: %v", err)
	}
	if result.CurrentTurn.Phase != PhaseWaitingForClue || result.CurrentTurn.Team != TeamBlue {
		t.Fatal("GuessCard - CurrentTeam returned an error")
	}
}
