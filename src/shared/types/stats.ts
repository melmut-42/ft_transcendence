/**
 * Match history and statistics, from Bruno
 * `rest-api/02 - Users & Profile/get-match-history.yml`.
 *
 * No leaderboard endpoint exists in this contract revision.
 */

import type { Score, Team } from './common';
import type { GameEndReason } from './game';
import type { RoomRole } from './room';

export type MatchResult = 'WIN' | 'LOSS';

export interface MatchOpponent {
  user_id: number;
  username: string;
}

export interface MatchHistoryEntry {
  game_id: number;
  room_id: number;
  /** This user's team in the match. */
  team: Team;
  /** This user's role in the match. */
  role: RoomRole;
  opponents: MatchOpponent[];
  result: MatchResult;
  end_reason: GameEndReason;
  score: Score;
  finished_at: string;
}

export interface MatchHistoryResponse {
  matches: MatchHistoryEntry[];
}

/**
 * `GET /api/users/me/matches` query parameters.
 *
 * Declared as a type alias rather than an interface so it carries an implicit index
 * signature and can be passed straight to the REST client's `query` option.
 */
export type MatchHistoryQuery = {
  /** `1..50`, default `20`. */
  limit?: number;
  /** ISO 8601 UTC pagination cursor. */
  before?: string;
};
