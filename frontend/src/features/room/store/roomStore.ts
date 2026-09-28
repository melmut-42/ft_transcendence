/**
 * Room domain store — temporary, room-scoped state only.
 *
 * It is written exclusively from authoritative server snapshots and events delivered by
 * the shared room connection. It never derives state the server already sends, and it
 * is cleared when the member leaves or the room closes.
 */

import { create } from 'zustand';

import type { Room, RoomServerEvent } from '@shared/types';

interface RoomState {
  room: Room | null;
  /** Server-driven countdown value; the frontend never runs its own start timer. */
  secondsRemaining: number | null;

  applySnapshot: (room: Room) => void;
  /** Apply one room-stream event. `game.*` deltas belong to the game store. */
  applyEvent: (event: RoomServerEvent) => void;
  clear: () => void;
}

export const useRoomStore = create<RoomState>((set, get) => ({
  room: null,
  secondsRemaining: null,

  applySnapshot: (room) =>
    set({ room, secondsRemaining: room.countdown?.seconds_remaining ?? null }),

  applyEvent: (event) => {
    const { room } = get();
    switch (event.type) {
      case 'room.state':
      case 'game.started':
      case 'game.state':
        get().applySnapshot(event.payload.room);
        return;
      case 'room.countdown.started':
      case 'room.countdown.tick':
        set({ secondsRemaining: event.payload.seconds_remaining });
        return;
      case 'room.countdown.cancelled':
        set({ secondsRemaining: null });
        return;
      case 'room.settings.updated':
        if (room) set({ room: { ...room, max_players: event.payload.max_players } });
        return;
      case 'room.player.updated':
        if (room) {
          const { player } = event.payload;
          set({
            room: {
              ...room,
              status: event.payload.room_status,
              startable: event.payload.startable,
              players: room.players.map((p) => (p.user_id === player.user_id ? player : p)),
            },
          });
        }
        return;
      case 'room.player.joined':
      case 'room.player.left':
        // Membership deltas are followed by a `room.state` snapshot, which carries the
        // authoritative member list; only the count and status are applied early.
        if (room) {
          set({
            room: {
              ...room,
              player_count: event.payload.player_count,
              status: event.payload.room_status,
              host_user_id: event.payload.host_user_id ?? room.host_user_id,
            },
          });
        }
        return;
      case 'game.ended':
        if (room) set({ room: { ...room, status: 'FINISHED' } });
        return;
      default:
        return;
    }
  },

  clear: () => set({ room: null, secondsRemaining: null }),
}));
