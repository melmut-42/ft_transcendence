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
  /**
   * The user ended the session themselves with Log Out, rather than losing it. The route
   * guard then takes them to Landing instead of asking them to log in again.
   */
  loggedOut: boolean;
  /** The session ended because the user deleted their own account; Landing says so once. */
  accountDeleted: boolean;

  setSession: (session: SessionResponse) => void;
  setAnonymous: (options?: { loggedOut?: boolean; accountDeleted?: boolean }) => void;
  /** Landing has shown the account-deleted notice. */
  acknowledgeAccountDeleted: () => void;
  setActiveRoomId: (roomId: number | null) => void;
  /** The username the server confirmed after the user renamed themselves. */
  setUsername: (username: string) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  status: 'UNKNOWN',
  user: null,
  activeRoomId: null,
  sessionExpiresAt: null,
  loggedOut: false,
  accountDeleted: false,

  setSession: (session) =>
    set({
      status: 'AUTHENTICATED',
      user: session.user,
      activeRoomId: session.active_room_id,
      sessionExpiresAt: session.session_expires_at,
      loggedOut: false,
      accountDeleted: false,
    }),

  setAnonymous: ({ loggedOut = false, accountDeleted = false } = {}) =>
    set({
      status: 'ANONYMOUS',
      user: null,
      activeRoomId: null,
      sessionExpiresAt: null,
      loggedOut: loggedOut || accountDeleted,
      accountDeleted,
    }),

  acknowledgeAccountDeleted: () => set({ accountDeleted: false }),

  setActiveRoomId: (activeRoomId) => set({ activeRoomId }),

  setUsername: (username) =>
    set((state) => (state.user ? { user: { ...state.user, username } } : state)),
}));
