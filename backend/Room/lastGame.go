package room

import (
	game "backend/Game"
	"time"
)

type LastGameView struct {
	GameID     int             `json:"game_id"`
	Status     game.GameStatus `json:"status"`
	Winner     game.Team       `json:"winner"`
	Loser      game.Team       `json:"loser"`
	EndReason  game.EndReason  `json:"end_reason"`
	Score      game.Score      `json:"score"`
	FinishedAt time.Time       `json:"finished_at"`
}

func newLastGame(snapshot game.GameSnapshot,
	finishedAt time.Time) *LastGameView {
	if snapshot.Winner == nil || snapshot.EndReason == nil {
		return nil
	}
	loser := game.TeamRed
	if *snapshot.Winner == game.TeamRed {
		loser = game.TeamBlue
	}
	return &LastGameView{
		GameID:     snapshot.GameID,
		Status:     game.GameStatusFinished,
		Winner:     *snapshot.Winner,
		Loser:      loser,
		EndReason:  *snapshot.EndReason,
		Score:      snapshot.Score,
		FinishedAt: finishedAt,
	}
}
