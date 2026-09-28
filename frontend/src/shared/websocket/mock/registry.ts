/**
 * Shared in-memory room registry for the mock layers.
 *
 * The mock REST API (`shared/api/mock`) and the mock sockets resolve the same room id
 * to the same `MockRoomServer`, so a room created or joined over mock REST is the room
 * the mock room socket then connects to, exactly as REST and WebSocket share one Game
 * Session on the server.
 */

import { useSessionStore } from '@shared/stores';

import type { MockRoomServer } from './mockRoomServer';
import type { MockPlayer } from './mockRoomServer';

/** Used only when no session is loaded (sockets mocked against a real, empty session). */
const FALLBACK_SELF: MockPlayer = { user_id: 42, username: 'player_one' };

export const mockRooms = new Map<number, MockRoomServer>();

export function mockSelfPlayer(): MockPlayer {
  const user = useSessionStore.getState().user;
  return user ? { user_id: user.user_id, username: user.username } : FALLBACK_SELF;
}
