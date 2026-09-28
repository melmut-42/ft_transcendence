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
 * A room socket that connects to a room nobody created over mock REST starts in the
 * scenario named by `VITE_MOCK_ROOM_SCENARIO` (default `room-waiting`; see
 * `scenarios.ts` for the list).
 *
 * Control it from the browser console:
 *
 *   mockSockets.scenario('operative-turn')       // fresh room in that scenario
 *   mockSockets.room().playerJoin({ user_id: 47, username: 'night_owl' })
 *   mockSockets.room().configureStartable('SPYMASTER')
 *   mockSockets.room().submitClue('ocean', 2)
 *   mockSockets.guess('NEUTRAL')                 // RED | BLUE | NEUTRAL | ASSASSIN
 *   mockSockets.room().passTurn()
 *   mockSockets.room().dropConnection(3000)      // RECONNECTING, then a fresh room.state
 *   mockSockets.chat.inviteReceived({ user_id: 43, username: 'red_agent' }, 1002, 'QWER12')
 */

import { WS_BASE_PATH, WS_CHAT_PATH } from '@shared/constants';
import type { CardColor } from '@shared/types';

import { setTransportFactory } from '../transport';
import type { TransportFactory } from '../transport';
import { MockChatServer } from './mockChatServer';
import { MockRoomServer } from './mockRoomServer';
import { MockTransport } from './mockTransport';
import { mockRooms, mockSelfPlayer } from './registry';
import { ROOM_SCENARIOS, applyRoomScenario, guessByColor, isRoomScenario } from './scenarios';
import type { RoomScenario } from './scenarios';

export { MOCK_BOTS, MockActionError, MockRoomServer } from './mockRoomServer';
export type { MockPlayer } from './mockRoomServer';
export { MockChatServer } from './mockChatServer';
export { mockRooms, mockSelfPlayer } from './registry';
export { ROOM_SCENARIOS, applyRoomScenario, guessByColor } from './scenarios';
export type { RoomScenario } from './scenarios';

const configuredScenario = import.meta.env.VITE_MOCK_ROOM_SCENARIO;
const DEFAULT_SCENARIO: RoomScenario = isRoomScenario(configuredScenario)
  ? configuredScenario
  : 'room-waiting';

export interface MockSockets {
  /** The room server for `roomId`, or the most recently connected room. */
  room(roomId?: number): MockRoomServer;
  readonly rooms: Map<number, MockRoomServer>;
  readonly chat: MockChatServer;
  /**
   * Replace the current room's server with a fresh one in `scenario` and make every
   * open room socket reconnect to it, so the client receives the new `room.state`.
   */
  scenario(scenario: RoomScenario, roomId?: number): MockRoomServer;
  /** Active-team guess of the first unrevealed card of `color`. Returns the card id. */
  guess(color: CardColor, byUserId?: number): number;
  /** Restore the browser WebSocket transport for sockets created afterwards. */
  uninstall(): void;
}

function freshRoom(roomId: number, scenario: RoomScenario): MockRoomServer {
  const server = new MockRoomServer(roomId, mockSelfPlayer());
  applyRoomScenario(server, scenario);
  mockRooms.set(roomId, server);
  return server;
}

export function installMockSockets(): MockSockets {
  const rooms = mockRooms;
  const chat = new MockChatServer();
  let lastRoomId: number | null = null;
  const roomPattern = new RegExp(`^${WS_BASE_PATH}/rooms/(\\d+)$`);

  const factory: TransportFactory = (options) => {
    if (options.path === WS_CHAT_PATH) return new MockTransport(options, chat);
    const match = roomPattern.exec(options.path);
    if (!match) throw new Error(`Mock sockets: no mock server for path ${options.path}.`);
    const roomId = Number(match[1]);
    if (!rooms.has(roomId)) freshRoom(roomId, DEFAULT_SCENARIO);
    lastRoomId = roomId;
    // Resolve the server per call, so a socket follows `scenario()` replacing its room.
    const current = (): MockRoomServer => rooms.get(roomId) ?? freshRoom(roomId, 'empty');
    return new MockTransport(options, {
      onOpen: (endpoint) => current().onOpen(endpoint),
      onClose: (endpoint) => current().onClose(endpoint),
      onCommand: (endpoint, message) => current().onCommand(endpoint, message),
    });
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
    scenario(scenario, roomId) {
      const id = roomId ?? lastRoomId;
      if (id === null) throw new Error('Mock sockets: no room socket has connected yet.');
      // Drop first, while the sockets still resolve to the old server; they reconnect
      // on the next tick and land on the fresh one.
      rooms.get(id)?.dropConnection(0);
      return freshRoom(id, scenario);
    },
    guess(color, byUserId) {
      return guessByColor(api.room(), color, byUserId);
    },
    uninstall() {
      setTransportFactory(null);
      delete (globalThis as { mockSockets?: MockSockets }).mockSockets;
    },
  };

  (globalThis as { mockSockets?: MockSockets }).mockSockets = api;
  console.info(
    `[mock sockets] installed (default room scenario: ${DEFAULT_SCENARIO}; available: ${ROOM_SCENARIOS.join(', ')}) — control them with \`mockSockets\` in the console.`,
  );
  return api;
}
