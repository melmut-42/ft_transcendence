import { useCallback, useRef, useState } from 'react';

import { endSession } from '@features/auth/api';
import { useChatStore } from '@features/chat/store/chatStore';
import { useGameStore } from '@features/game/store/gameStore';
import { useInviteStore } from '@features/lobby/store/inviteStore';
import { useOwnProfileStore } from '@features/profile/store/ownProfileStore';
import { useSentInvitesStore } from '@features/profile/store/sentInvitesStore';
import { forgetRoomCode } from '@features/room/model/roomCode';
import { useRoomStore } from '@features/room/store/roomStore';
import { ApiError } from '@shared/api';
import { useConnectionStore, useModalStore, useSessionStore } from '@shared/stores';

export type LogOutStatus = 'IDLE' | 'PENDING' | 'FAILED';

/** Forget everything this tab held for the signed-in user; the account itself is untouched. */
function clearPrivateState(): void {
  useRoomStore.getState().clear();
  useGameStore.getState().clear();
  useChatStore.getState().clear();
  useInviteStore.getState().clear();
  useSentInvitesStore.getState().clear();
  useOwnProfileStore.getState().clear();
  useConnectionStore.getState().setRoomLost(false);
}

/**
 * Log Out, from Settings.
 *
 *   DELETE /api/auth/session -> clear private state -> anonymous session -> Landing
 *
 * The server revokes both session cookies, closes this session's sockets and, during a
 * match, settles it as a forfeit; the account, friends and statistics stay. Only once it
 * has answered does the client let go: every store holding the user's private data is
 * cleared and the session becomes anonymous as a log-out, so the route guard takes the
 * user to Landing. Leaving the private routes unmounts the room and chat sockets, and the
 * room route lets the user go without its leave prompt, since the server already ended the
 * membership. A session the server no longer knows (`401`) is already logged out. Any
 * other failure keeps the user signed in and says so. One press sends one request.
 *
 * It lives at app level because it clears the stores of several features.
 */
export function useLogOut() {
  const [status, setStatus] = useState<LogOutStatus>('IDLE');
  const busy = useRef(false);

  const logOut = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    setStatus('PENDING');
    try {
      await endSession();
    } catch (cause) {
      if (!(cause instanceof ApiError && cause.status === 401)) {
        busy.current = false;
        setStatus('FAILED');
        return;
      }
    }

    const session = useSessionStore.getState();
    if (session.activeRoomId !== null) forgetRoomCode(session.activeRoomId);
    useModalStore.getState().close();
    clearPrivateState();
    session.setAnonymous({ loggedOut: true });
  }, []);

  return { status, logOut };
}
