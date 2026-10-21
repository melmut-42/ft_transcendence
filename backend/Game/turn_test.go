package game

import (
	"errors"
	"testing"
	"time"
)

// Turn tests

// Turn timer tests

const testTimer = 60 * time.Second

func newTimedTestGame() *Game {
	game := newTestGame()
	timer := testTimer
	game.turnTimer = &timer
	game.startTurnTimer(testNow)
	return game
}

func checkDeadline(t *testing.T, turn CurrentTurn, want time.Time) {
	t.Helper()
	if turn.DeadlineAt == nil || !turn.DeadlineAt.Equal(want) {
		t.Fatalf("expected deadline %v, got %v", want, turn.DeadlineAt)
	}
}

func TestNewGameTurnTimer(t *testing.T) {
	wordPack := loadTestWordPack(t, "wordpack.json")
	seed := [32]byte{42}

	game, err := NewGameWithSeed(wordPack.Words, "en", seed, nil, testNow)
	if err != nil {
		t.Fatalf("NewGameWithSeed without timer: %v", err)
	}
	if game.currentTurn.DeadlineAt != nil {
		t.Fatalf("game without timer must have nil deadline, got %v", game.currentTurn.DeadlineAt)
	}

	timer := testTimer
	game, err = NewGameWithSeed(wordPack.Words, "en", seed, &timer, testNow)
	if err != nil {
		t.Fatalf("NewGameWithSeed with timer: %v", err)
	}
	checkDeadline(t, game.currentTurn, testNow.Add(testTimer))
	if err := game.ValidateGameState(); err != nil {
		t.Fatalf("new timed game is invalid: %v", err)
	}

	zero := time.Duration(0)
	if _, err := NewGameWithSeed(wordPack.Words, "en", seed, &zero, testNow); !errors.Is(err, ErrInvalidArgument) {
		t.Fatalf("expected ErrInvalidArgument for zero timer, got %v", err)
	}
}

func TestClueDoesNotExtendDeadline(t *testing.T) {
	game := newTimedTestGame()
	spymaster := &Player{UserID: 1, Team: TeamRed, Role: RoleSpymaster}

	turn, err := game.GiveClue(spymaster, &Clue{Word: "hint", Number: 2}, testNow.Add(20*time.Second))
	if err != nil {
		t.Fatalf("GiveClue: %v", err)
	}
	checkDeadline(t, turn, testNow.Add(testTimer))
}

func TestTurnChangeStartsFreshDeadline(t *testing.T) {
	game := newTimedTestGame()
	spymaster := &Player{UserID: 1, Team: TeamRed, Role: RoleSpymaster}
	operative := &Player{UserID: 2, Team: TeamRed, Role: RoleOperative}

	if _, err := game.GiveClue(spymaster, &Clue{Word: "hint", Number: 2}, testNow); err != nil {
		t.Fatalf("GiveClue: %v", err)
	}
	passAt := testNow.Add(30 * time.Second)
	result, err := game.PassTurn(operative, passAt)
	if err != nil {
		t.Fatalf("PassTurn: %v", err)
	}
	checkDeadline(t, result.CurrentTurn, passAt.Add(testTimer))

	game = newTimedTestGame()
	if _, err := game.GiveClue(spymaster, &Clue{Word: "hint", Number: 2}, testNow); err != nil {
		t.Fatalf("GiveClue: %v", err)
	}
	guessAt := testNow.Add(10 * time.Second)
	guess, err := game.GuessCard(operative, 20, guessAt)
	if err != nil {
		t.Fatalf("GuessCard: %v", err)
	}
	checkDeadline(t, guess.CurrentTurn, guessAt.Add(testTimer))
}

func TestExpireTurnIfDue(t *testing.T) {
	game := newTimedTestGame()
	spymaster := &Player{UserID: 1, Team: TeamRed, Role: RoleSpymaster}
	if _, err := game.GiveClue(spymaster, &Clue{Word: "hint", Number: 2}, testNow); err != nil {
		t.Fatalf("GiveClue: %v", err)
	}

	before := cloneTestGame(game)
	result, err := game.PassTurnIfExpired(testNow.Add(testTimer - time.Second))
	if err != nil || result != nil {
		t.Fatalf("turn must not expire before deadline, got %+v, %v", result, err)
	}
	checkGameUnchanged(t, before, game)

	scoreBefore := game.Score()
	expireAt := testNow.Add(testTimer)
	result, err = game.PassTurnIfExpired(expireAt)
	if err != nil || result == nil {
		t.Fatalf("turn must expire at deadline, got %+v, %v", result, err)
	}
	if result.ChangeReason != ChangeReasonTurnTimerExpired ||
		result.CurrentTurn.Team != TeamBlue ||
		result.CurrentTurn.Phase != PhaseWaitingForClue ||
		result.CurrentTurn.Clue != nil || result.CurrentTurn.GuessesRemaining != nil ||
		result.Score != scoreBefore {
		t.Fatalf("unexpected result after expiry: %+v", result)
	}
	checkDeadline(t, result.CurrentTurn, expireAt.Add(testTimer))

	game = newTestGame()
	if result, err := game.PassTurnIfExpired(testNow.Add(time.Hour)); err != nil || result != nil {
		t.Fatalf("game without timer must never expire, got %+v, %v", result, err)
	}
}

func TestCommandAfterDeadlineIsRejected(t *testing.T) {
	game := newTimedTestGame()
	spymaster := &Player{UserID: 1, Team: TeamRed, Role: RoleSpymaster}
	operative := &Player{UserID: 2, Team: TeamRed, Role: RoleOperative}
	late := testNow.Add(testTimer)

	before := cloneTestGame(game)
	if _, err := game.GiveClue(spymaster, &Clue{Word: "hint", Number: 2}, late); !errors.Is(err, ErrNotYourTurn) {
		t.Fatalf("expected ErrNotYourTurn for late clue, got %v", err)
	}
	checkGameUnchanged(t, before, game)

	if _, err := game.GiveClue(spymaster, &Clue{Word: "hint", Number: 2}, testNow); err != nil {
		t.Fatalf("GiveClue: %v", err)
	}
	before = cloneTestGame(game)
	if _, err := game.GuessCard(operative, 1, late); !errors.Is(err, ErrNotYourTurn) {
		t.Fatalf("expected ErrNotYourTurn for late guess, got %v", err)
	}
	checkGameUnchanged(t, before, game)

	if _, err := game.PassTurn(operative, late); !errors.Is(err, ErrNotYourTurn) {
		t.Fatalf("expected ErrNotYourTurn for late pass, got %v", err)
	}
	checkGameUnchanged(t, before, game)
}

func TestPauseKeepsRemainingTime(t *testing.T) {
	game := newTimedTestGame()

	if err := game.PauseForPlayers(Player{UserID: 1, Username: "player_one", Team: TeamRed, Role: RoleSpymaster}, testNow.Add(20*time.Second)); err != nil {
		t.Fatalf("PauseForPlayers: %v", err)
	}
	if game.currentTurn.DeadlineAt != nil {
		t.Fatalf("deadline must be nil while paused, got %v", game.currentTurn.DeadlineAt)
	}
	if err := game.ValidateGameState(); err != nil {
		t.Fatalf("paused game is invalid: %v", err)
	}

	if result, err := game.PassTurnIfExpired(testNow.Add(time.Hour)); err != nil || result != nil {
		t.Fatalf("paused game must not expire, got %+v, %v", result, err)
	}

	resumeAt := testNow.Add(5 * time.Minute)
	if err := game.ResumeAfterPlayersRestored(resumeAt); err != nil {
		t.Fatalf("ResumeAfterPlayersRestored: %v", err)
	}
	checkDeadline(t, game.currentTurn, resumeAt.Add(40*time.Second))
	if game.remainingOnPause != nil {
		t.Fatal("remaining time must be cleared after resume")
	}
}

func TestGameOverClearsDeadline(t *testing.T) {
	game := newTimedTestGame()
	spymaster := &Player{UserID: 1, Team: TeamRed, Role: RoleSpymaster}
	operative := &Player{UserID: 2, Team: TeamRed, Role: RoleOperative}
	if _, err := game.GiveClue(spymaster, &Clue{Word: "hint", Number: 2}, testNow); err != nil {
		t.Fatalf("GiveClue: %v", err)
	}
	result, err := game.GuessCard(operative, 25, testNow)
	if err != nil {
		t.Fatalf("GuessCard: %v", err)
	}
	if result.CurrentTurn.DeadlineAt != nil {
		t.Fatalf("finished game must have nil deadline, got %v", result.CurrentTurn.DeadlineAt)
	}

	game = newTimedTestGame()
	if err := game.PauseForPlayers(Player{UserID: 1, Username: "player_one", Team: TeamRed, Role: RoleSpymaster}, testNow); err != nil {
		t.Fatalf("PauseForPlayers: %v", err)
	}
	if err := game.CancelForInsufficientPlayers(testNow); err != nil {
		t.Fatalf("CancelForInsufficientPlayers: %v", err)
	}
	if game.currentTurn.DeadlineAt != nil || game.remainingOnPause != nil {
		t.Fatal("cancelled game must not keep a turn timer")
	}
	if err := game.ValidateGameState(); err != nil {
		t.Fatalf("cancelled game is invalid: %v", err)
	}
}
