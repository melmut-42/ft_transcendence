/**
 * Mock socket layer for development and tests.
 *
 * `installMockSockets()` swaps the transport factory so every `RoomConnection` and
 * `ChatConnection` created afterwards talks to an in-memory server instead of the
 * Gateway. Nothing above the transport changes: the same envelopes, event types, stores
 * and components run either way.
 *
 * It is loaded only through a dynamic import guarded by `import.meta.env.DEV` and
 * `VITE_MOCK_SOCKETS=true` (see `main.tsx`), so a production build never contains it.
 *
 * Control it from the browser console:
 *
 *   mockSockets.room().playerJoin({ user_id: 7, username: 'red_agent' })
 *   mockSockets.room().configureStartable('SPYMASTER')
 *   mockSockets.room().submitClue('ocean', 2)
 *   mockSockets.chat.inviteReceived({ user_id: 7, username: 'red_agent' }, 1002, 'QWER12')
 */

import { WS_BASE_PATH, WS_CHAT_PATH } from '@shared/constants';
import { useSessionStore } from '@shared/stores';

import { setTransportFactory } from '../transport';
import type { TransportFactory } from '../transport';
import { MockChatServer } from './mockChatServer';
import { MockRoomServer } from './mockRoomServer';
import type { MockPlayer } from './mockRoomServer';
import { MockTransport } from './mockTransport';

export { MockActionError, MockRoomServer } from './mockRoomServer';
export type { MockPlayer } from './mockRoomServer';
export { MockChatServer } from './mockChatServer';

const FALLBACK_SELF: MockPlayer = { user_id: 42, username: 'player_one' };

export interface MockSockets {
  /** The room server for `roomId`, or the most recently connected room. */
  room(roomId?: number): MockRoomServer;
  readonly rooms: Map<number, MockRoomServer>;
  readonly chat: MockChatServer;
  /** Restore the browser WebSocket transport for sockets created afterwards. */
  uninstall(): void;
}

function selfPlayer(): MockPlayer {
  const user = useSessionStore.getState().user;
  return user ? { user_id: user.user_id, username: user.username } : FALLBACK_SELF;
}

export function installMockSockets(): MockSockets {
  const rooms = new Map<number, MockRoomServer>();
  const chat = new MockChatServer();
  let lastRoomId: number | null = null;
  const roomPattern = new RegExp(`^${WS_BASE_PATH}/rooms/(\\d+)$`);

  const factory: TransportFactory = (options) => {
    if (options.path === WS_CHAT_PATH) return new MockTransport(options, chat);
    const match = roomPattern.exec(options.path);
    if (!match) throw new Error(`Mock sockets: no mock server for path ${options.path}.`);
    const roomId = Number(match[1]);
    let server = rooms.get(roomId);
    if (!server) {
      server = new MockRoomServer(roomId, selfPlayer());
      rooms.set(roomId, server);
    }
    lastRoomId = roomId;
    return new MockTransport(options, server);
  };

  setTransportFactory(factory);

  const api: MockSockets = {
    room(roomId) {
      const id = roomId ?? lastRoomId;
      const server = id === null ? undefined : rooms.get(id);
      if (!server) throw new Error('Mock sockets: no room socket has connected yet.');
      return server;
    },
    rooms,
    chat,
    uninstall() {
      setTransportFactory(null);
      delete (globalThis as { mockSockets?: MockSockets }).mockSockets;
    },
  };

  (globalThis as { mockSockets?: MockSockets }).mockSockets = api;
  console.info('[mock sockets] installed — control them with `mockSockets` in the console.');
  return api;
}
