package game

import (
	"errors"
	"reflect"
	"testing"
)

func cloneTestGame(g *Game) *Game {
	copied := *g

	if g.board != nil {
		board := *g.board
		copied.board = &board
	}

	copied.currentTurn = g.currentTurn.Clone()

	if g.winner != nil {
		winner := *g.winner
		copied.winner = &winner
	}
	if g.endReason != nil {
		reason := *g.endReason
		copied.endReason = &reason
	}
	return &copied
}

func checkGameUnchanged(t *testing.T, before, after *Game) {
	t.Helper()

	if !reflect.DeepEqual(before, after) {
		t.Fatal("Rejected action changed the game state")
	}
}

func initGuessingTestGame(t *testing.T, clueNumber int, guessRemaining int) *Game {
	t.Helper()
	game := newTestGame()

	game.currentTurn.Phase = PhaseGuessing
	game.currentTurn.Clue = &Clue{
		Word:   "hint",
		Number: clueNumber,
	}
	game.currentTurn.GuessesRemaining = &guessRemaining

	if _, err := game.board.reveal(2); err != nil {
		t.Fatalf("guessing preparing - reveal: %v", err)
	}
	return game
}

func TestGuessCard(t *testing.T) {
	game := initGuessingTestGame(t, 2, 1)
	player := &Player{UserID: 1, Team: TeamRed, Role: RoleOperative}

	result, err := game.GuessCard(player, 5)
	if err != nil {
		t.Fatalf("GuessCard returned an error: %v", err)
	}
	if *result.Card.Color != CardColorRed || !result.Card.Revealed ||
		result.Card.CardID != 5 || result.Card.Word != "word5" {
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

func TestRejectedGameActions(t *testing.T) {
	game := initGuessingTestGame(t, 2, 1)
	player := &Player{
		UserID: 1,
		Team:   TeamRed,
		Role:   RoleOperative,
	}

	before := cloneTestGame(game)
	_, err := game.GuessCard(player, 35)
	if err == nil {
		t.Fatal("Invalid CardID should give an error")
	}
	if !errors.Is(err, ErrInvalidCard) {
		t.Fatalf("wating ErrInvalidCard but got : %v", err)
	}
	checkGameUnchanged(t, before, game)

	before = cloneTestGame(game)
	spymaster := &Player{Team: TeamRed, Role: RoleSpymaster}
	_, err = game.GiveClue(spymaster, &Clue{Word: "hint", Number: 2})
	if !errors.Is(err, ErrInvalidRoomState) {
		t.Fatalf("Waiting ErrInvalidRoomState but got: %v", err)
	}
	checkGameUnchanged(t, before, game)

	before = cloneTestGame(game)
	_, err = game.GuessCard(player, 2)
	if !errors.Is(err, ErrCardAlreadyRevealed) {
		t.Fatalf("waiting ErrCardAlreadyRevealed but got: %v", err)
	}
	checkGameUnchanged(t, before, game)
}

func TestGuessOtherTeamCard(t *testing.T) {
	game := initGuessingTestGame(t, 2, 1)
	player := &Player{UserID: 1, Team: TeamRed, Role: RoleOperative}

	result, err := game.GuessCard(player, 15)
	if err != nil {
		t.Fatalf("Other Team: GuessCard returned an error: %v", err)
	}
	if result.ChangeReason == nil {
		t.Fatal("expected ChangeReason ChangeReasonOpponentCardRevealed but got nil")
	}
	if result.GuessingTeam != TeamRed || *result.ChangeReason != ChangeReasonOpponentCardRevealed ||
		result.CurrentTurn.Team != TeamBlue || result.IsCorrectGuess == true ||
		result.CurrentTurn.Phase != PhaseWaitingForClue ||
		result.Score.Blue != 1 || result.CurrentTurn.Clue != nil ||
		result.CurrentTurn.GuessesRemaining != nil {
		t.Fatalf("GuessOtherTeamCard returned an error: \n%+v", result)
	}
}

func TestGuessCardAssassinNeutral(t *testing.T) {
	game := initGuessingTestGame(t, 2, 1)
	player := &Player{UserID: 1, Team: TeamRed, Role: RoleOperative}

	result, err := game.GuessCard(player, 25)
	if err != nil {
		t.Fatalf("Assassin: GuessCard returned an error: %v", err)
	}
	if result.ChangeReason != nil {
		t.Fatal("terminal result must not have a turn change reason")
	}
	if *result.EndReason != EndReasonAssassinRevealed || *result.Winner != TeamBlue || result.CurrentTurn.Phase != PhaseGameOver {
		t.Fatal("GuessCard - EndReason, Winner, Phase returned an error")
	}

	game = initGuessingTestGame(t, 2, 1)
	result, err = game.GuessCard(player, 20)
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
	game := initGuessingTestGame(t, 2, 2)
	player := &Player{UserID: 5, Team: TeamRed, Role: RoleOperative}

	passTurn, err := game.PassTurn(player)
	if err != nil {
		t.Fatalf("PassTurn returned an error: %v", err)
	}
	if game.currentTurn.Team != TeamBlue || game.currentTurn.GuessesRemaining != nil || game.currentTurn.Phase != PhaseWaitingForClue || game.currentTurn.Clue != nil || passTurn.ChangeReason != ChangeReasonPassed {
		t.Fatal("PassTurn func is not working correctly.")
	}

	game = initGuessingTestGame(t, 2, 2)
	player = &Player{UserID: 5, Team: TeamRed, Role: RoleOperative}
	*game.currentTurn.GuessesRemaining = 0
	before := cloneTestGame(game)
	passTurn, err = game.PassTurn(player)
	if err == nil {
		t.Fatal("Expected an error, got none")
	}
	if !errors.Is(err, ErrNoGuessesRemaining) {
		t.Fatalf("Wrong error: expected %v, got %v", ErrNoGuessesRemaining, err)
	}
	checkGameUnchanged(t, before, game)

	game = initGuessingTestGame(t, 2, 2)
	before = cloneTestGame(game)
	player = &Player{UserID: 5, Team: TeamBlue, Role: RoleOperative}
	passTurn, err = game.PassTurn(player)

	if err == nil {
		t.Fatal("Expected an error, got none")
	}
	if !errors.Is(err, ErrNotYourTurn) {
		t.Fatalf("Wrong error: expected %v, got %v", ErrNotYourTurn, err)
	}
	checkGameUnchanged(t, before, game)
}

func TestGuessFinalTeamCard(t *testing.T) {
	game := newTestGame()
	spymaster := &Player{UserID: 1, Team: TeamRed, Role: RoleSpymaster}
	operative := &Player{UserID: 2, Team: TeamRed, Role: RoleOperative}

	if _, err := game.GiveClue(spymaster, &Clue{Word: "hint", Number: 9}); err != nil {
		t.Fatalf("GiveClue: %v", err)
	}

	var result GuessResult
	for cardID := 1; cardID <= 9; cardID++ {
		var err error
		result, err = game.GuessCard(operative, cardID)
		if err != nil {
			t.Fatalf("Card %d Guess: %v", cardID, err)
		}
	}

	if result.Winner == nil || *result.Winner != TeamRed ||
		result.EndReason == nil || *result.EndReason != EndReasonAllTeamCardsRevealed ||
		result.Score != (Score{Red: 9, Blue: 0}) ||
		result.CurrentTurn.Phase != PhaseGameOver ||
		result.CurrentTurn.Clue != nil || result.CurrentTurn.GuessesRemaining != nil ||
		result.ChangeReason != nil {
		t.Fatalf("Unexpected result when all RED cards are revealed: %+v", result)
	}
}
