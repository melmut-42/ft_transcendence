package game

import (
	"fmt"
	"time"
)

func handleTeamCard(g *Game, cardTeam Team, now time.Time) *ChangeReason {
	target := 8
	if g.board.startingTeam == cardTeam {
		target = 9
	}
	score := g.Score()
	revealed := score.Red
	if cardTeam == TeamBlue {
		revealed = score.Blue
	}
	if revealed >= target {
		g.finish(cardTeam, EndReasonAllTeamCardsRevealed, now)
		return nil
	}
	if g.currentTurn.Team != cardTeam {
		reason := ChangeReasonOpponentCardRevealed
		g.switchTurn(reason, now)
		return &reason
	}
	*g.currentTurn.GuessesRemaining--
	if *g.currentTurn.GuessesRemaining <= 0 {
		reason := ChangeReasonGuessesExhausted
		g.switchTurn(reason, now)
		return &reason
	}
	return nil
}

func opposite(t Team) Team {
	if t == TeamRed {
		return TeamBlue
	}
	return TeamRed
}

func handleCardColor(g *Game, card *card, now time.Time) *ChangeReason {
	activeTeam := g.currentTurn.Team
	switch card.color {
	case CardColorAssassin:
		g.finish(opposite(activeTeam), EndReasonAssassinRevealed, now)
	case CardColorNeutral:
		reason := ChangeReasonNeutralCardRevealed
		g.switchTurn(reason, now)
		return &reason
	case CardColorRed:
		return handleTeamCard(g, TeamRed, now)
	case CardColorBlue:
		return handleTeamCard(g, TeamBlue, now)
	}
	return nil
}

func (g *Game) GuessCard(player *Player, cardID int, now time.Time) (GuessResult, error) {
	if err := validateTurnAction(g, player, PhaseGuessing, RoleOperative, now); err != nil {
		return GuessResult{}, err
	}
	if *g.currentTurn.GuessesRemaining <= 0 {
		return GuessResult{}, fmt.Errorf("%w: no guesses remaining", ErrNoGuessesRemaining)
	}
	card, err := g.board.reveal(cardID)
	if err != nil {
		return GuessResult{}, err
	}
	team := player.Team
	userID := player.UserID
	username := player.Username
	revealedID := card.cardID
	word := card.word
	color := card.color
	g.addHistory(HistoryEntry{
		Type:     HistoryCardRevealed,
		Team:     &team,
		UserID:   &userID,
		Username: &username,
		CardID:   &revealedID,
		Word:     &word,
		Color:    &color,
	}, now)

	changeReason := handleCardColor(g, &card, now)
	winner, endReason, finishedAt := g.cloneGameResult()

	return GuessResult{
		GameID:         g.GameID,
		Card:           newCardView(card),
		GuessingTeam:   player.Team,
		IsCorrectGuess: (player.Team == TeamRed && card.color == CardColorRed) || (player.Team == TeamBlue && card.color == CardColorBlue),
		Score:          g.Score(),
		CurrentTurn:    g.currentTurn.Clone(),
		ChangeReason:   changeReason,
		Winner:         winner,
		EndReason:      endReason,
		FinishedAt:     finishedAt,
	}, nil
}
