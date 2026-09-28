/**
 * Authoritative game state, from Bruno `rest-api/03 - Rooms/get-room-snapshot.yml`
 * and the `game.*` WebSocket events.
 *
 * The frontend never derives a winner. Only a terminal `game.ended` event or a
 * `FINISHED` snapshot is authoritative — `workspace.yml` · Game Rules.
 */

import type { Score, Team } from './common';

export type GamePhase = 'WAITING_FOR_CLUE' | 'GUESSING' | 'GAME_OVER';
export type CardColor = 'RED' | 'BLUE' | 'NEUTRAL' | 'ASSASSIN';
export type GameEndReason = 'ALL_TEAM_CARDS_REVEALED' | 'ASSASSIN_REVEALED' | 'PLAYER_FORFEIT';

/**
 * One board slot. `card_id` is a stable `1..25` slot identifier that carries zero
 * affiliation information — nothing may infer color from it (Card ID invariant).
 */
export interface Card {
  card_id: number;
  word: string;
  revealed: boolean;
  /**
   * `null` only for a card an Operative is not allowed to see yet. Spymasters always
   * receive the true color. The projection is made server-side per recipient.
   */
  color: CardColor | null;
}

export interface Clue {
  /** Normalized: trimmed, Unicode lowercase, single word, 1..30 characters. */
  word: string;
  /** `N`, in `1..9`. A clue grants `N + 1` guesses. */
  number: number;
}

export interface CurrentTurn {
  team: Team;
  phase: GamePhase;
  /** `null` while waiting for a clue. */
  clue: Clue | null;
  /** `N + 1` at clue acceptance; `null` while waiting for a clue. */
  guesses_remaining: number | null;
}

export interface Game {
  game_id: number;
  /** Team owning 9 cards and the first clue; chosen at random per game. */
  starting_team: Team;
  current_turn: CurrentTurn;
  score: Score;
  /** Exactly 25 cards, in fixed board order. */
  board: Card[];
  /** Non-null only after a terminal result. */
  winner: Team | null;
  end_reason: GameEndReason | null;
  started_at: string;
  finished_at: string | null;
}
