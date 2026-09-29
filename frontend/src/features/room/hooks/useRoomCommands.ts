/**
 * Ready Room commands sent over the shared room socket.
 *
 * Each command settles when the server answers it: resolved by its ack, rejected with a
 * `RoomCommandError` carrying the error code. The answer is feedback only. The member's
 * team, role and ready state change when the matching `room.player.updated` and
 * `room.state` events arrive, for this client and every other one alike.
 */

import { useMemo } from 'react';

import { useRoomConnection } from '@app/connection/roomConnectionContext';
import type { AckMessage, RoomRole, Team } from '@shared/types';

export function useRoomCommands() {
  const connection = useRoomConnection();
  return useMemo(
    () => ({
      selectTeam: (team: Team): Promise<AckMessage> =>
        connection.request('room.team.select', { team }),
      selectRole: (role: RoomRole): Promise<AckMessage> =>
        connection.request('room.role.select', { role }),
      setReady: (ready: boolean): Promise<AckMessage> =>
        connection.request('room.ready.set', { ready }),
      updateMaxPlayers: (maxPlayers: number): Promise<AckMessage> =>
        connection.request('room.settings.update', { max_players: maxPlayers }),
    }),
    [connection],
  );
}
