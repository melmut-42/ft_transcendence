package game

import "time"

type GameSnapshot struct {
	GameID       int            `json:"game_id"`
	StartingTeam Team           `json:"starting_team"`
	CurrentTurn  CurrentTurn    `json:"current_turn"`
	Score        Score          `json:"score"`
	Board        []CardView     `json:"board"`
	Winner       *Team          `json:"winner"`
	EndReason    *EndReason     `json:"end_reason"`
	Status       GameStatus     `json:"status"`
	StartedAt    time.Time      `json:"started_at"`
	FinishedAt   *time.Time     `json:"finished_at"`
	History      []HistoryEntry `json:"history"`
}

func cardViewForRole(card card, role *Role) (CardView, error) {
	if role != nil && *role != RoleOperative && *role != RoleSpymaster {
		return CardView{}, ErrInvalidRole
	}
	view := newCardView(card)
	if role != nil && *role == RoleSpymaster {
		view.Color = &card.color
	}
	return view, nil
}

func (b *Board) boardViewForRole(role *Role) ([]CardView, error) {
	if role != nil && *role != RoleOperative && *role != RoleSpymaster {
		return nil, ErrInvalidRole
	}
	views := make([]CardView, len(b.cards))
	for i := range b.cards {
		view, err := cardViewForRole(b.cards[i], role)
		if err != nil {
			return nil, err
		}
		views[i] = view
	}
	return views, nil
}

func (g *Game) SnapshotForRole(role *Role) (GameSnapshot, error) {
	if role != nil && *role != RoleOperative && *role != RoleSpymaster {
		return GameSnapshot{}, ErrInvalidRole
	}
	view, err := g.board.boardViewForRole(role)
	if err != nil {
		return GameSnapshot{}, err
	}
	winner, endReason, finishedAt := g.cloneGameResult()
	return GameSnapshot{
		GameID:       g.GameID,
		StartingTeam: g.board.startingTeam,
		CurrentTurn:  g.currentTurn.Clone(),
		Score:        g.Score(),
		Board:        view,
		Winner:       winner,
		EndReason:    endReason,
		Status:       g.Status(),
		StartedAt:    g.startedAt,
		FinishedAt:   finishedAt,
		History:      g.cloneHistory(),
	}, nil
}
