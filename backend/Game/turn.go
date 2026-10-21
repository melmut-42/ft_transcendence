package game

import (
	"time"
)

func (g *Game) startTurnTimer(now time.Time) {
	g.currentTurn.DeadlineAt = nil
	if g.turnTimer != nil {
		deadline := now.Add(*g.turnTimer)
		g.currentTurn.DeadlineAt = &deadline
	}
}

func (g *Game) switchTurn(reason ChangeReason, now time.Time) {
	previousTeam := g.currentTurn.Team
	g.currentTurn.Team = opposite(g.currentTurn.Team)
	g.currentTurn.Phase = PhaseWaitingForClue
	g.currentTurn.Clue = nil
	g.currentTurn.GuessesRemaining = nil
	g.startTurnTimer(now)

	newTeam := g.currentTurn.Team
	reasonText := string(reason)
	g.addHistory(HistoryEntry{
		Type:         HistoryTurnChanged,
		Team:         &newTeam,
		PreviousTeam: &previousTeam,
		Reason:       &reasonText,
	}, now)
}

func (g *Game) PassTurn(player *Player, now time.Time) (PassResult, error) {
	if err := validateTurnAction(g, player, PhaseGuessing, RoleOperative, now); err != nil {
		return PassResult{}, err
	}
	if *g.currentTurn.GuessesRemaining <= 0 {
		return PassResult{}, ErrNoGuessesRemaining
	}
	team := player.Team
	userID := player.UserID
	username := player.Username
	g.addHistory(HistoryEntry{
		Type:     HistoryTurnPassed,
		Team:     &team,
		UserID:   &userID,
		Username: &username,
	}, now)

	g.switchTurn(ChangeReasonPassed, now)
	return PassResult{
		GameID:       g.GameID,
		Score:        g.Score(),
		CurrentTurn:  g.currentTurn.Clone(),
		ChangeReason: ChangeReasonPassed,
	}, nil
}

func (g *Game) turnExpired(now time.Time) bool {
	return g.currentTurn.DeadlineAt != nil && !now.Before(*g.currentTurn.DeadlineAt)
}

func (g *Game) PassTurnIfExpired(now time.Time) (*PassResult, error) {
	if err := g.ValidateGameState(); err != nil {
		return nil, err
	}
	if g.currentTurn.Phase != PhaseWaitingForClue && g.currentTurn.Phase != PhaseGuessing {
		return nil, nil
	}
	if !g.turnExpired(now) {
		return nil, nil
	}
	g.switchTurn(ChangeReasonTurnTimerExpired, now)
	return &PassResult{
		GameID:       g.GameID,
		Score:        g.Score(),
		CurrentTurn:  g.currentTurn.Clone(),
		ChangeReason: ChangeReasonTurnTimerExpired,
	}, nil
}
