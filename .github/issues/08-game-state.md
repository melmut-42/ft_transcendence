## Description
Consume authoritative game state from the shared room connection and expose it as role-safe projections.

## Tasks

* Apply `game.started`, `game.clue.submitted`, `game.card.revealed`, `game.score.updated`, `game.turn.changed`, `game.ended`, and the `game` object embedded in `room.state`.
* Role-safe projections: Spymaster state and Operative state are separate views over the same authoritative payload.
* Score (`score.red`, `score.blue`).
* Turn (`current_turn.team`, `current_turn.phase`).
* Clue (`current_turn.clue.word`, `current_turn.clue.number`).
* `guesses_remaining`.
* Terminal game state (`winner`, `end_reason`, `finished_at`).

## Rules

* **The frontend never calculates the winner.** Only a terminal `game.ended` event or a `FINISHED` snapshot is authoritative. Never compare `score.red` to `score.blue` to decide an outcome.
* An Operative's projection has `color: null` on every unrevealed card. That absence is the contract, not missing data — never fill it in, infer it, or treat it as an error.
* `card_id` carries zero affiliation information. Nothing may infer color from a card's id, parity or position.
* Either colour may be the starting team that owns 9 cards, so both score values independently range 0–9.

## Contract Source

Bruno `rest-api/03 - Rooms/get-room-snapshot.yml` (game object), `websocket/05 - Server Events/server-event-catalog.yml`, `07 - Full State Scenarios/in-game-role-projections.yml`.

## Acceptance Criteria

* Every game field rendered in the UI comes from server state, with nothing recomputed locally.
* The winner is only ever read from `winner` / `end_reason`.
* Score, turn, phase, clue and `guesses_remaining` stay correct across a reconnect.
* A `FINISHED` snapshot produces the same terminal view as the live `game.ended` event.

## Dependencies

Depends on the room WebSocket integration.
