## Description
Build the Spymaster gameplay experience.

## Tasks

* Spymaster board projection: all 25 cards with their true colours (`RED`, `BLUE`, `NEUTRAL`, `ASSASSIN`).
* Clue form: word plus number.
* Clue number selector, `1`–`9`.
* Submit via `game.clue.submit`.
* Validation and error feedback: `INVALID_CLUE`, `INVALID_CLUE_NUMBER`, `NOT_YOUR_TURN`, `ROLE_FORBIDDEN`, `INVALID_ROOM_STATE`.
* Waiting states: after submitting, while the opposing team plays, and while own Operatives guess.

## Rules

* **Spymaster-only data must never reach Operative components or Operative state.** Keep the full-colour projection out of any store slice or prop an Operative view can read.
* Client-side clue validation mirrors the contract only: trimmed, a single non-whitespace word, 1–30 characters, stored lowercase; number is an integer 1–9. Do not add stricter official Codenames clue rules — the contract deliberately does not impose them.
* A clue grants `N + 1` guesses. The server reports `guesses_remaining`; do not compute it.
* Only the active team's Spymaster may submit, and only in `WAITING_FOR_CLUE`.

## Contract Source

Bruno `websocket/04 - Game/submit-clue.yml`.

## Acceptance Criteria

* The Spymaster sees every card's colour.
* The clue form is disabled outside the Spymaster's own turn and `WAITING_FOR_CLUE` phase.
* Rejected clues show a specific message per error code and leave the form recoverable.
* No component or store reachable from an Operative view holds unrevealed card colours.

## Dependencies

Depends on the game state integration.
