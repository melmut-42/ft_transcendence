package room

import "time"

type PostGameView struct {
	DeadlineAt     time.Time `json:"deadline_at"`
	PendingUserIDs []int     `json:"pending_user_ids"`
}

func (r *Room) PostGame(members []RoomMember) *PostGameView {
	if r.PostGameEndsAt == nil {
		return nil
	}
	var pendingUserIDs []int
	for _, member := range members {
		if member.RoomID == r.RoomID && member.State == StatePostGame {
			pendingUserIDs = append(pendingUserIDs, member.UserID)
		}
	}
	if len(pendingUserIDs) == 0 {
		return nil
	}
	return &PostGameView{
		DeadlineAt:     *r.PostGameEndsAt,
		PendingUserIDs: pendingUserIDs,
	}
}
