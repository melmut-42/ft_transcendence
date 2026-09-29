/**
 * The shareable code of the room the user is in.
 *
 * The room snapshot does not carry `room_code`: the server hands it out when the room is
 * created (`POST /api/rooms`) and when a code is looked up before joining. The Ready Room
 * shows it so players can invite friends, so it is kept for the browser tab that entered
 * the room, keyed by `room_id`, and survives a reload of that tab. It is a public invitation
 * code, never a credential. Leaving the room forgets it; where it is unknown, the Ready Room
 * leaves the code out rather than show a guess.
 */

import { ROOM_CODE_PATTERN } from '@shared/types';

const key = (roomId: number): string => `room-code:${roomId}`;

export function rememberRoomCode(roomId: number, roomCode: string): void {
  if (!ROOM_CODE_PATTERN.test(roomCode)) return;
  try {
    sessionStorage.setItem(key(roomId), roomCode);
  } catch {
    // Storage can be unavailable (private mode, blocked site data); the code is optional.
  }
}

export function recallRoomCode(roomId: number): string | null {
  try {
    const code = sessionStorage.getItem(key(roomId));
    return code && ROOM_CODE_PATTERN.test(code) ? code : null;
  } catch {
    return null;
  }
}

export function forgetRoomCode(roomId: number): void {
  try {
    sessionStorage.removeItem(key(roomId));
  } catch {
    // Nothing was stored.
  }
}
