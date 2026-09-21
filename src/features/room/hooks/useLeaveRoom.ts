/**
 * LEAVE ROOM / LEAVE GAME flow.
 *
 * `request()` opens the confirmation step; `confirm()` leaves. LEAVE GAME forfeits the
 * match for the member's team. On success the room socket is closed, room and game state are
 * cleared, the session's active room is reset, and the user lands on the Lobby.
 * Remaining members learn about it from the server (`room.player.left`, or `game.ended`
 * with `PLAYER_FORFEIT`), so nothing else is sent.
 */

import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useRoomConnection } from '@app/connection/roomConnectionContext';
import type { ApiError } from '@shared/api';
import { ROUTES } from '@shared/constants';
import { useSessionStore } from '@shared/stores';

import { leaveRoom } from '../api';
import { leaveActionFor } from '../model/leave';
import type { LeaveAction } from '../model/leave';
import { useRoomStore } from '../store/roomStore';

export type LeaveStatus = 'IDLE' | 'CONFIRMING' | 'LEAVING' | 'FAILED';

export function useLeaveRoom() {
  const connection = useRoomConnection();
  const navigate = useNavigate();
  const roomStatus = useRoomStore((state) => state.room?.status ?? 'WAITING');
  const [status, setStatus] = useState<LeaveStatus>('IDLE');
  const [error, setError] = useState<ApiError | null>(null);
  const action: LeaveAction = leaveActionFor(roomStatus);

  const leave = useCallback(async () => {
    setStatus('LEAVING');
    setError(null);
    try {
      await leaveRoom(connection.roomId);
    } catch (cause) {
      const apiError = cause as ApiError;
      // Not a member any more means the leave already happened; finish the cleanup.
      if (apiError.code !== 'NOT_ROOM_MEMBER' && apiError.code !== 'ROOM_NOT_FOUND') {
        setError(apiError);
        setStatus('FAILED');
        return;
      }
    }
    connection.disconnect();
    // Room and game stores are cleared by `RoomConnectionProvider` when it unmounts.
    useSessionStore.getState().setActiveRoomId(null);
    setStatus('IDLE');
    navigate(ROUTES.lobby, { replace: true });
  }, [connection, navigate]);

  const request = useCallback(() => {
    if (action.confirmation) setStatus('CONFIRMING');
    else void leave();
  }, [action.confirmation, leave]);

  const cancel = useCallback(() => setStatus('IDLE'), []);

  return { action, status, error, request, confirm: leave, cancel };
}
