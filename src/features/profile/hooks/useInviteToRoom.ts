/**
 * INVITE action on another player's profile.
 *
 * Inviting needs an active room to invite into and an online target; the server checks
 * the rest (friendship, room `WAITING` and not full, target not already in a room) and
 * answers with a specific error code, which becomes the Unavailable reason.
 */

import { useCallback, useState } from 'react';

import type { ApiError } from '@shared/api';
import { useSessionStore } from '@shared/stores';
import type { PublicProfile } from '@shared/types';

import { inviteFriend } from '../api';

export type InviteUnavailableReason =
  | 'SELF'
  | 'NO_ACTIVE_ROOM'
  | 'OFFLINE'
  | 'NOT_FRIENDS'
  | 'IN_ROOM'
  | 'ROOM_FULL'
  | 'ROOM_NOT_JOINABLE';

export type InviteState =
  | { status: 'IDLE' }
  | { status: 'SENDING' }
  | { status: 'SENT' }
  | { status: 'UNAVAILABLE'; reason: InviteUnavailableReason }
  | { status: 'FAILED'; error: ApiError };

const REASON_BY_CODE: Record<string, InviteUnavailableReason> = {
  USER_OFFLINE: 'OFFLINE',
  NOT_FRIENDS: 'NOT_FRIENDS',
  USER_IN_ROOM: 'IN_ROOM',
  ROOM_FULL: 'ROOM_FULL',
  ROOM_NOT_JOINABLE: 'ROOM_NOT_JOINABLE',
};

export const INVITE_REASON_TEXT: Record<InviteUnavailableReason, string> = {
  SELF: 'This is your profile.',
  NO_ACTIVE_ROOM: 'Join or create a room to invite players.',
  OFFLINE: 'This player is offline.',
  NOT_FRIENDS: 'Add this player as a friend to invite them.',
  IN_ROOM: 'This player is already in a room.',
  ROOM_FULL: 'Your room is full.',
  ROOM_NOT_JOINABLE: 'Your room has already started.',
};

export function useInviteToRoom(profile: PublicProfile | null) {
  const me = useSessionStore((state) => state.user);
  const activeRoomId = useSessionStore((state) => state.activeRoomId);
  const [result, setResult] = useState<InviteState>({ status: 'IDLE' });

  let precondition: InviteUnavailableReason | null = null;
  if (profile && me?.user_id === profile.user_id) precondition = 'SELF';
  else if (activeRoomId === null) precondition = 'NO_ACTIVE_ROOM';
  else if (profile && !profile.is_online) precondition = 'OFFLINE';

  const state: InviteState =
    precondition && result.status === 'IDLE'
      ? { status: 'UNAVAILABLE', reason: precondition }
      : result;

  const invite = useCallback(async () => {
    if (!profile || activeRoomId === null || precondition) return;
    setResult({ status: 'SENDING' });
    try {
      await inviteFriend(activeRoomId, profile.user_id);
      setResult({ status: 'SENT' });
    } catch (cause) {
      const error = cause as ApiError;
      const reason = REASON_BY_CODE[error.code];
      setResult(reason ? { status: 'UNAVAILABLE', reason } : { status: 'FAILED', error });
    }
  }, [activeRoomId, precondition, profile]);

  return { state, invite };
}
