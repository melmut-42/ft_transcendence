## Description
Implement the game end and results state.

Results is a state inside the room route, not a separate route — the room stays `FINISHED` and visible to every member until each one leaves.

## Tasks

* Normal win (`end_reason: ALL_TEAM_CARDS_REVEALED`).
* Assassin loss (`end_reason: ASSASSIN_REVEALED`).
* Forfeit (`end_reason: PLAYER_FORFEIT`), including the `abandoned_by_user_id` field.
* Final score and final board state.
* Leave room.
* Return to the Lobby.

## Rules

* **No score-comparison winner logic.** `winner` and `loser` come from `game.ended` or a `FINISHED` snapshot. A full board never ends in a score tiebreak, because a terminal reveal always fires first.
* For a forfeit, `revealed_card` is `null` — no card triggered it. The results view must handle that without breaking.
* There is no rematch transition. A new match means creating or joining a new room.
* `DELETE /api/rooms/{room_id}/members/me` is legal in `FINISHED`; the room closes when the last member leaves.

## Contract Source

Bruno `websocket/05 - Server Events/server-event-catalog.yml` (forfeit example), `04 - Game/guess-card.yml` (terminal branches).

## Acceptance Criteria

* All three end reasons render distinctly and correctly.
* A forfeit result renders with `revealed_card` null.
* The winner shown always matches the server's `winner` field.
* Leaving returns to the Lobby and clears all room-scoped state.
* No rematch or "play again in this room" affordance is offered.

## Dependencies

Depends on the game state integration.
