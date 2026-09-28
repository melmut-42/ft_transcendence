/**
 * Room lifecycle and membership types, from Bruno `rest-api/03 - Rooms/` and the
 * `room.*` WebSocket events.
 *
 * `room_id` (internal path key) and `room_code` (human-shareable) are never
 * interchangeable — `workspace.yml` · Room Identifier Consistency.
 */

import type { Team } from './common';
import type { Game } from './game';

export type RoomRole = 'SPYMASTER' | 'OPERATIVE';
export type RoomStatus = 'WAITING' | 'COUNTDOWN' | 'IN_GAME' | 'FINISHED' | 'CLOSED';

/**
 * Room capacity bounds. `max_players` is chosen at creation (default 8) and can be
 * changed by the host while `WAITING`, never below the current `player_count`. The
 * minimum equals the smallest startable room.
 */
export const ROOM_CAPACITY = { min: 4, max: 8, default: 8 } as const;

/** `^[A-Z0-9]{6}$` — the one canonical shareable room-code format. */
export const ROOM_CODE_PATTERN = /^[A-Z0-9]{6}$/;

export interface RoomMember {
  user_id: number;
  username: string;
  /** `null` until the member selects a team. */
  team: Team | null;
  /** `null` until the member selects a role. */
  role: RoomRole | null;
  ready: boolean;
  is_host: boolean;
  /** Join order; drives deterministic host transfer. */
  joined_at: string;
}

export interface RoomCountdown {
  seconds_remaining: number;
}

/**
 * The canonical room schema. Returned by create/join/snapshot over REST and carried
 * as `payload.room` by `room.state` and `game.started` over WebSocket.
 */
export interface Room {
  room_id: number;
  status: RoomStatus;
  host_user_id: number;
  player_count: number;
  /** `ROOM_CAPACITY.min..ROOM_CAPACITY.max`. Join fails with `ROOM_FULL` at this count. */
  max_players: number;
  /** Full server-side start predicate, not merely "everyone is ready". */
  startable: boolean;
  /** Present only while `status` is `COUNTDOWN`. */
  countdown?: RoomCountdown;
  players: RoomMember[];
  /** Non-null only in `IN_GAME` and `FINISHED`. */
  game: Game | null;
  created_at: string;
}

/** `POST /api/rooms` body. Omitted `max_players` means `ROOM_CAPACITY.default`. */
export interface CreateRoomRequest {
  max_players?: number;
}

/** `POST /api/rooms` response — the only place `room_code` is issued. */
export interface CreateRoomResponse extends Room {
  room_code: string;
}

/** `GET /api/rooms/lookup/{room_code}` — resolve a code before calling Join room. */
export interface RoomLookupResponse {
  room_id: number;
  room_code: string;
  status: RoomStatus;
  player_count: number;
  max_players: number;
}

/** `POST /api/rooms/{room_id}/invites` body and response. */
export interface InviteFriendRequest {
  user_id: number;
}

export interface InviteFriendResponse {
  room_id: number;
  room_code: string;
  to_user_id: number;
  sent_at: string;
}
