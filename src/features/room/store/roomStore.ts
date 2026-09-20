/**
 * Room domain store — temporary, room-scoped state only.
 *
 * It is written exclusively from authoritative server snapshots and events delivered by
 * the shared room connection. It never derives state the server already sends, and it
 * is cleared when the member leaves or the room closes.
 */

import { create } from 'zustand';

import type { Room } from '@shared/types';

interface RoomState {
  room: Room | null;
  /** Server-driven countdown value; the frontend never runs its own start timer. */
  secondsRemaining: number | null;

  applySnapshot: (room: Room) => void;
  clear: () => void;
}

export const useRoomStore = create<RoomState>((set) => ({
  room: null,
  secondsRemaining: null,

  // TODO(room): add the per-event reducers (player joined/left/updated, countdown).
  applySnapshot: (room) =>
    set({ room, secondsRemaining: room.countdown?.seconds_remaining ?? null }),
  clear: () => set({ room: null, secondsRemaining: null }),
}));
