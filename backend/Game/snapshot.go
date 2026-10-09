package game

//game paketi kartlar, başlangıç takımı, sıra, skor ve oyun sonucu gibi oyun bilgilerini üretir. room tarafı üyeler, host, oda ayarları, countdown ve kullanıcıya hangi oyunun gösterileceğiyle ilgilenir.

type GameSnapshot struct {
	GameID       int         `json:"game_id"`
	StartingTeam Team        `json:"starting_team"`
	CurrentTurn  CurrentTurn `json:"current_turn"`
	Score        Score       `json:"score"`
	Board        []CardView  `json:"board"`
	Winner       *Team       `json:"winner"`
	EndReason    *EndReason  `json:"end_reason"`
}

func cardViewForRole(card card, role Role) (CardView, error) {
	if role != RoleOperative && role != RoleSpymaster && role != RoleSpectator {
		return CardView{}, ErrInvalidRole
	}
	view := newCardView(card)
	if role == RoleSpymaster {
		view.Color = &card.color
	}
	return view, nil
}

func (b *Board) boardViewForRole(role Role) ([]CardView, error) {
	if role != RoleOperative && role != RoleSpymaster && role != RoleSpectator {
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

func (g *Game)SnapshotForRole(role Role) (GameSnapshot, error) {
	if role != RoleOperative && role != RoleSpymaster && role != RoleSpectator {
		return GameSnapshot{}, ErrInvalidRole
	}
	view, err := g.board.boardViewForRole(role)
	if err != nil {
		return GameSnapshot{}, err
	}
	winner, endReason := g.cloneGameResult()
	return GameSnapshot{
		GameID: g.GameID,
		StartingTeam: g.board.startingTeam,
		CurrentTurn: g.currentTurn.Clone(),
		Score: g.Score(),
		Board: view,
		Winner: winner,
		EndReason: endReason,
	}, nil
}

