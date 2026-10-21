package game

import (
	cryptorand "crypto/rand"
	"fmt"
	rand "math/rand/v2"
	"time"
)

type Game struct {
	GameID           int
	board            *Board
	currentTurn      CurrentTurn
	winner           *Team
	endReason        *EndReason
	phaseBeforePause *Phase
	turnTimer        *time.Duration
	remainingOnPause *time.Duration
	startedAt        time.Time
	finishedAt       *time.Time
	history          []HistoryEntry
}

func NewSecureSeed() ([32]byte, error) {
	var seed [32]byte
	_, err := cryptorand.Read(seed[:])
	if err != nil {
		return [32]byte{}, fmt.Errorf("%w: %v", ErrGenerateSeed, err)
	}
	return seed, nil
}

func NewGameWithSeed(wordPool []Word, language string, seed [32]byte, turnTimer *time.Duration, now time.Time) (*Game, error) {
	if turnTimer != nil && *turnTimer <= 0 {
		return nil, fmt.Errorf("%w: turn timer must be positive", ErrInvalidArgument)
	}

	r := rand.New(rand.NewChaCha8(seed))

	board, err := NewBoard(wordPool, language, r)
	if err != nil {
		return nil, err
	}
	game := &Game{
		GameID: 0,
		board:  board,
		currentTurn: CurrentTurn{
			Team:             board.StartingTeam(),
			Phase:            PhaseWaitingForClue,
			Clue:             nil,
			GuessesRemaining: nil,
		},
		winner:    nil,
		endReason: nil,
	}
	if turnTimer != nil {
		timer := *turnTimer
		game.turnTimer = &timer
	}
	game.startTurnTimer(now)
	game.startedAt = now

	startingTeam := board.StartingTeam()
	game.addHistory(HistoryEntry{
		Type: HistoryGameStarted,
		Team: &startingTeam,
	}, now)

	return game, nil
}

func NewGame(wordPool []Word, language string, turnTimer *time.Duration, now time.Time) (*Game, error) {
	seed, err := NewSecureSeed()
	if err != nil {
		return nil, err
	}

	return NewGameWithSeed(wordPool, language, seed, turnTimer, now)
}

func (g *Game) cloneGameResult() (*Team, *EndReason, *time.Time) {
	var winner *Team
	if g.winner != nil {
		winnerCopy := *g.winner
		winner = &winnerCopy
	}

	var endReason *EndReason
	if g.endReason != nil {
		endReasonCopy := *g.endReason
		endReason = &endReasonCopy
	}
	var finishedAt *time.Time
	if g.finishedAt != nil {
		finishedAtCopy := *g.finishedAt
		finishedAt = &finishedAtCopy
	}
	return winner, endReason, finishedAt
}

func (g *Game) Score() Score {
	redScore := 0
	blueScore := 0

	for _, card := range g.board.Cards() {
		if !card.revealed {
			continue
		}
		switch card.color {
		case CardColorRed:
			redScore++
		case CardColorBlue:
			blueScore++
		}
	}

	return Score{
		Red:  redScore,
		Blue: blueScore,
	}
}

func (g *Game) GiveClue(player *Player, clue *Clue, now time.Time) (CurrentTurn, error) {
	if err := validateTurnAction(g, player, PhaseWaitingForClue, RoleSpymaster, now); err != nil {
		return CurrentTurn{}, err
	}
	cleaned, err := validateClue(g.board, clue)
	if err != nil {
		return CurrentTurn{}, err
	}

	guesses := clue.Number + 1
	g.currentTurn.Clue = &cleaned
	g.currentTurn.Phase = PhaseGuessing
	g.currentTurn.GuessesRemaining = &guesses

	team := player.Team
	userID := player.UserID
	username := player.Username
	clueCopy := cleaned
	g.addHistory(HistoryEntry{
		Type:     HistoryClueGiven,
		Team:     &team,
		UserID:   &userID,
		Username: &username,
		Clue:     &clueCopy,
	}, now)

	return g.currentTurn.Clone(), nil
}

func (g *Game) finish(winner Team, reason EndReason, now time.Time) {
	g.currentTurn.Phase = PhaseGameOver
	g.currentTurn.Clue = nil
	g.currentTurn.GuessesRemaining = nil
	g.currentTurn.DeadlineAt = nil
	g.winner = &winner
	g.endReason = &reason
	g.finishedAt = &now

	winnerTeam := winner
	reasonText := string(reason)
	g.addHistory(HistoryEntry{
		Type:   HistoryGameEnded,
		Team:   &winnerTeam,
		Reason: &reasonText,
	}, now)
}

func (g *Game) Status() GameStatus {
	if g.currentTurn.Phase == PhaseGameOver {
		if *g.endReason == EndReasonInsufficientPlayers {
			return GameStatusCancelled
		}
		return GameStatusFinished
	}
	return GameStatusInProgress
}
