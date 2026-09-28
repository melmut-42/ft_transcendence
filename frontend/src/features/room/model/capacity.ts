/**
 * Room capacity rules as the contract defines them (`ROOM_CAPACITY`). The server
 * enforces every one of them; these helpers only decide what the UI offers.
 */

import { ROOM_CAPACITY } from '@shared/types';
import type { Room, RoomLookupResponse } from '@shared/types';

export const isRoomFull = (room: Pick<Room, 'player_count' | 'max_players'>): boolean =>
  room.player_count >= room.max_players;

/** `"4 / 8 Players"` — the lobby and join-dialog capacity label. */
export const capacityLabel = (room: Pick<Room, 'player_count' | 'max_players'>): string =>
  `${room.player_count} / ${room.max_players} Players`;

/** Capacities a Create Room form may offer. */
export const createCapacityOptions = (): number[] => range(ROOM_CAPACITY.min, ROOM_CAPACITY.max);

/** Capacities the host may switch to right now: never below the current membership. */
export const settingsCapacityOptions = (room: Pick<Room, 'player_count'>): number[] =>
  range(Math.max(ROOM_CAPACITY.min, room.player_count), ROOM_CAPACITY.max);

export interface RoomSettingsAccess {
  editable: boolean;
  /** Why the control is read-only, for the disabled-state hint. */
  reason: 'NOT_HOST' | 'NOT_WAITING' | null;
}

export function roomSettingsAccess(room: Room, userId: number): RoomSettingsAccess {
  if (room.host_user_id !== userId) return { editable: false, reason: 'NOT_HOST' };
  if (room.status !== 'WAITING') return { editable: false, reason: 'NOT_WAITING' };
  return { editable: true, reason: null };
}

/** Join-dialog verdict from a code lookup, before the Join request is sent. */
export type JoinAvailability = 'JOINABLE' | 'FULL' | 'NOT_JOINABLE';

export function joinAvailability(lookup: RoomLookupResponse): JoinAvailability {
  if (lookup.status !== 'WAITING') return 'NOT_JOINABLE';
  return isRoomFull(lookup) ? 'FULL' : 'JOINABLE';
}

function range(from: number, to: number): number[] {
  return Array.from({ length: Math.max(0, to - from + 1) }, (_, i) => from + i);
}
