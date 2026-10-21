package game

import (
	"time"
)

func (g *Game) PauseForPlayers(departed Player, now time.Time) error {
	if err := g.ValidateGameState(); err != nil {
		return err
	}
	if g.currentTurn.Phase == PhasePausedForPlayers {
		return ErrPhaseAlreadyPaused
	}
	if g.currentTurn.Phase != PhaseWaitingForClue &&
		g.currentTurn.Phase != PhaseGuessing {
		return ErrInvalidGameState
	}
	previousPhase := g.currentTurn.Phase
	g.phaseBeforePause = &previousPhase
	g.currentTurn.Phase = PhasePausedForPlayers
	if g.currentTurn.DeadlineAt != nil {
		remaining := max(g.currentTurn.DeadlineAt.Sub(now), 0)
		g.remainingOnPause = &remaining
		g.currentTurn.DeadlineAt = nil
	}

	team := departed.Team
	userID := departed.UserID
	username := departed.Username
	g.addHistory(HistoryEntry{
		Type:     HistoryGamePaused,
		Team:     &team,
		UserID:   &userID,
		Username: &username,
	}, now)
	return nil
}

func (g *Game) ResumeAfterPlayersRestored(now time.Time) error {
	if err := g.ValidateGameState(); err != nil {
		return err
	}
	if g.currentTurn.Phase != PhasePausedForPlayers {
		return ErrInvalidGameState
	}

	g.currentTurn.Phase = *g.phaseBeforePause
	g.phaseBeforePause = nil
	if g.remainingOnPause != nil {
		deadline := now.Add(*g.remainingOnPause)
		g.currentTurn.DeadlineAt = &deadline
		g.remainingOnPause = nil
	}

	activeTeam := g.currentTurn.Team
	g.addHistory(HistoryEntry{
		Type: HistoryGameResumed,
		Team: &activeTeam,
	}, now)
	return nil
}

func (g *Game) CancelForInsufficientPlayers(now time.Time) error {
	if err := g.ValidateGameState(); err != nil {
		return err
	}
	if g.currentTurn.Phase != PhasePausedForPlayers {
		return ErrInvalidGameState
	}

	reason := EndReasonInsufficientPlayers
	g.currentTurn.Phase = PhaseGameOver
	g.currentTurn.Clue = nil
	g.currentTurn.GuessesRemaining = nil
	g.currentTurn.DeadlineAt = nil
	g.winner = nil
	g.endReason = &reason
	g.phaseBeforePause = nil
	g.remainingOnPause = nil
	g.finishedAt = &now

	reasonText := string(reason)
	g.addHistory(HistoryEntry{
		Type:   HistoryGameEnded,
		Team:   nil,
		Reason: &reasonText,
	}, now)

	return nil
}
