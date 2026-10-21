package room

import (
	game "backend/Game"
	"time"
)

const staffingTimeout = 120 * time.Second

type TeamStaffing struct {
	MissingRoles []game.Role `json:"missing_roles"`
	DeadlineAt   *time.Time  `json:"deadline_at"`
}

type StaffingView struct {
	Red  TeamStaffing `json:"red"`
	Blue TeamStaffing `json:"blue"`
}

type StaffingDeadlines struct {
	Red  *time.Time `gorm:"column:red_staffing_deadline_at"`
	Blue *time.Time `gorm:"column:blue_staffing_deadline_at"`
}

func missingRoles(members []RoomMember, team game.Team) []game.Role {
	hasSpymaster := false
	hasOperative := false
	for _, member := range members {
		if member.Team == nil || member.Role == nil {
			continue
		}
		if *member.Team != team {
			continue
		}
		switch *member.Role {
		case game.RoleSpymaster:
			hasSpymaster = true
		case game.RoleOperative:
			hasOperative = true
		}
	}
	missing := []game.Role{}
	if !hasSpymaster {
		missing = append(missing, game.RoleSpymaster)
	}
	if !hasOperative {
		missing = append(missing, game.RoleOperative)
	}
	return missing
}

func nextDeadline(missing []game.Role, current *time.Time, now time.Time) *time.Time {
	if len(missing) == 0 {
		return nil
	}
	if current != nil {
		return current
	}
	deadline := now.Add(staffingTimeout)
	return &deadline
}

func UpdateStaffing(members []RoomMember, deadlines *StaffingDeadlines, now time.Time) StaffingView {
	redMissing := missingRoles(members, game.TeamRed)
	blueMissing := missingRoles(members, game.TeamBlue)

	deadlines.Red = nextDeadline(redMissing, deadlines.Red, now)
	deadlines.Blue = nextDeadline(blueMissing, deadlines.Blue, now)

	return StaffingView{
		Red: TeamStaffing{
			MissingRoles: redMissing,
			DeadlineAt:   deadlines.Red,
		},
		Blue: TeamStaffing{
			MissingRoles: blueMissing,
			DeadlineAt:   deadlines.Blue,
		},
	}
}
