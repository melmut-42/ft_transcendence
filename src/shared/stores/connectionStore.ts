/**
 * Live connection status for both sockets.
 *
 * Purely frontend/ephemeral state: it drives the Reconnecting overlay and any
 * "you are offline" affordance. It never mirrors domain data — room and game state
 * come from the snapshots and events the connection delivers.
 */

import { create } from 'zustand';

import type { ConnectionCloseReason, ConnectionStatus } from '@shared/websocket';

interface SocketState {
  status: ConnectionStatus;
  closeReason: ConnectionCloseReason | null;
}

interface ConnectionState {
  room: SocketState;
  chat: SocketState;

  setRoomStatus: (status: ConnectionStatus, reason?: ConnectionCloseReason) => void;
  setChatStatus: (status: ConnectionStatus, reason?: ConnectionCloseReason) => void;
}

const initial: SocketState = { status: 'IDLE', closeReason: null };

export const useConnectionStore = create<ConnectionState>((set) => ({
  room: initial,
  chat: initial,

  setRoomStatus: (status, reason) => set({ room: { status, closeReason: reason ?? null } }),
  setChatStatus: (status, reason) => set({ chat: { status, closeReason: reason ?? null } }),
}));
