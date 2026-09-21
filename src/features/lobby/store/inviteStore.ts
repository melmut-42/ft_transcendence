/**
 * Incoming room invitations, live-only. They arrive as `room.invite.received` on the
 * chat socket, are never stored by the server, and disappear on reload. Accepting one
 * is an ordinary Join room request, which applies every normal join check.
 */

import { create } from 'zustand';

import type { RoomInviteReceivedEvent } from '@shared/types';

export interface RoomInvite {
  event_id: string;
  room_id: number;
  room_code: string;
  from_user: { user_id: number; username: string };
  sent_at: string;
}

interface InviteState {
  invites: RoomInvite[];

  receive: (event: RoomInviteReceivedEvent) => void;
  dismiss: (eventId: string) => void;
  clear: () => void;
}

export const useInviteStore = create<InviteState>((set) => ({
  invites: [],

  receive: (event) =>
    set(({ invites }) => ({
      // A newer invitation to the same room replaces the older one.
      invites: [
        ...invites.filter((i) => i.room_id !== event.payload.room_id),
        { event_id: event.event_id, sent_at: event.sent_at, ...event.payload },
      ],
    })),
  dismiss: (eventId) =>
    set(({ invites }) => ({ invites: invites.filter((i) => i.event_id !== eventId) })),
  clear: () => set({ invites: [] }),
}));
