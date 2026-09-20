/**
 * Session/auth state — the only store that knows who the user is.
 *
 * It holds no credential: both session cookies are HttpOnly and unreadable from JS.
 * `activeRoomId` mirrors `GET /api/auth/session`, which derives it live from room
 * membership, and is what route recovery on refresh reads instead of trusting the URL.
 *
 * Actions here are state transitions only. The REST calls that produce them belong to
 * `features/auth/api`.
 */

import { create } from 'zustand';

import type { SessionResponse } from '@shared/types';

/** `UNKNOWN` until bootstrap finishes — route guards must not redirect before then. */
export type SessionStatus = 'UNKNOWN' | 'AUTHENTICATED' | 'ANONYMOUS';

export interface SessionUser {
  user_id: number;
  username: string;
}

interface SessionState {
  status: SessionStatus;
  user: SessionUser | null;
  activeRoomId: number | null;
  sessionExpiresAt: string | null;

  setSession: (session: SessionResponse) => void;
  setAnonymous: () => void;
  setActiveRoomId: (roomId: number | null) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  status: 'UNKNOWN',
  user: null,
  activeRoomId: null,
  sessionExpiresAt: null,

  setSession: (session) =>
    set({
      status: 'AUTHENTICATED',
      user: session.user,
      activeRoomId: session.active_room_id,
      sessionExpiresAt: session.session_expires_at,
    }),

  setAnonymous: () =>
    set({ status: 'ANONYMOUS', user: null, activeRoomId: null, sessionExpiresAt: null }),

  setActiveRoomId: (activeRoomId) => set({ activeRoomId }),
}));
