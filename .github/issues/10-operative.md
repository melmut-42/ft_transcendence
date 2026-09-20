## Description
Build the Operative gameplay experience.

## Tasks

* Operative-safe board: words and reveal state, with revealed colours only.
* Guess a card via `game.card.guess`.
* Pass the turn via `game.turn.pass`.
* Remaining guesses display.
* Turn state (own turn, opponent's turn, waiting for a clue).
* Error feedback: `NOT_YOUR_TURN`, `ROLE_FORBIDDEN`, `INVALID_CARD`, `CARD_ALREADY_REVEALED`, `NO_GUESSES_REMAINING`, `GAME_ALREADY_FINISHED`.
* Waiting states while the Spymaster thinks and while the opposing team plays.

## Rules

* **Unrevealed ownership information must never be expected from the frontend contract.** An Operative's projection has `color: null` on unrevealed cards; that is correct and final. No code path may request, reconstruct or guess it.
* `CARD_ALREADY_REVEALED`, `NO_GUESSES_REMAINING` and `GAME_ALREADY_FINISHED` mean local state is stale: discard it and apply the next snapshot (`FATAL_GAME_STATE`), rather than patching around the error.
* Only the active team's Operatives may guess or pass, and only in `GUESSING`.

## Contract Source

Bruno `websocket/04 - Game/guess-card.yml` and `pass-turn.yml`.

## Acceptance Criteria

* Unrevealed cards render without any colour hint of any kind.
* Guess and Pass are disabled outside the Operative's own turn and `GUESSING` phase.
* `guesses_remaining` is read from the server, never decremented locally.
* A stale-state error triggers a snapshot refresh rather than a local correction.

## Dependencies

Depends on the game state integration.
