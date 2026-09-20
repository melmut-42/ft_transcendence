## Description
Implement match history and statistics.

## Tasks

* Wins, losses and `matches_played` from the profile payloads.
* Level, defined by the contract as `1 + floor(wins / 5)` and returned by the server — display it, do not recompute it.
* Match history list from `GET /api/users/me/matches` (paginated by `limit`, default 20, maximum 50, and a `before` timestamp cursor).
* Each entry: `game_id`, `room_id`, own `team`, `opponents`, `result` (`WIN` / `LOSS`), `end_reason`, final `score`, `finished_at`.
* Loading, error and empty states.

## Rules

* **No leaderboard.** No leaderboard endpoint exists, and one must not be added unless the contract later defines it.
* `end_reason` includes `PLAYER_FORFEIT`; forfeited matches appear in history exactly like any other settled match.
* Pagination uses the `before` cursor, not a page number.

## Contract Source

Bruno `rest-api/02 - Users & Profile/get-match-history.yml`.

## Acceptance Criteria

* History paginates correctly with the `before` cursor.
* All three `end_reason` values render meaningfully.
* Level is read from the server response.
* Empty history renders a proper empty state, not a spinner or an error.

## Dependencies

Depends on the profile modal.
