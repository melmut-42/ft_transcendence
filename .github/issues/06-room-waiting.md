## Description
Build the Room Waiting experience: everything a player does between joining a room and the game starting.

## Tasks

* Room member list, in join order, with avatar, username, team, role and ready state.
* Team selection (`RED` / `BLUE`) via `room.team.select`.
* Role selection (`SPYMASTER` / `OPERATIVE`) via `room.role.select`.
* Ready / unready via `room.ready.set`.
* Host badge, informational only.
* Countdown display driven by `room.countdown.started`, `room.countdown.tick` and `room.countdown.cancelled`.
* Presence and disconnect affordances for other members.
* Leave behavior via `DELETE /api/rooms/{room_id}/members/me`.

## Rules the UI must reflect

* There is **no manual START PARTY action**. No host-start command exists. The server enters `COUNTDOWN` by itself the moment the full start predicate becomes true, and cancels it the moment it breaks.
* The countdown is backend-authoritative: render `seconds_remaining` from the server's events. Do not run a local timer as the source of truth.
* Ready can only be set after both a team and a role are chosen (`TEAM_REQUIRED`, `ROLE_REQUIRED`).
* Changing team or role resets `ready` to false — the server does this, and `room.player.updated.changed_fields` reports both fields changing together.
* A team may have exactly one Spymaster; a second attempt is rejected with `ROLE_CONFLICT`.
* `startable` is the server's full predicate. Do not recompute "is everyone ready" locally to decide whether to start.

## Contract Gap

The room member schema currently has no per-member connection/presence field. Until the contract adds one, "presence/disconnect state" here means this client's own connection status plus membership events (`room.player.left`), not a per-member online indicator. Raise a contract change if a per-member indicator is wanted.

## Contract Source

Bruno `websocket/02 - Team & Role/`, `03 - Ready & Countdown/`, `01 - Room Lobby/membership-events.yml`.

## Acceptance Criteria

* No start button exists anywhere in the room UI.
* Countdown values come from server events only.
* Selecting a team or role visibly resets ready state.
* `ROLE_CONFLICT`, `TEAM_REQUIRED` and `ROLE_REQUIRED` produce specific, understandable feedback.
* A cancelled countdown returns the room to the waiting view and shows the reason.
* Leaving the room returns to the Lobby and clears room-scoped state.

## Dependencies

Depends on application routing and the Create/Join Room flows.
