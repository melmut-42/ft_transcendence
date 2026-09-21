/**
 * Lobby commands sent over the shared room socket. Each returns the `request_id`, or
 * `null` when the socket is not open; state changes arrive as server events.
 */

import { useMemo } from 'react';

import { useRoomConnection } from '@app/connection/roomConnectionContext';
import type { RoomRole, Team } from '@shared/types';

export function useRoomCommands() {
  const connection = useRoomConnection();
  return useMemo(
    () => ({
      selectTeam: (team: Team) => connection.send('room.team.select', { team }),
      selectRole: (role: RoomRole) => connection.send('room.role.select', { role }),
      setReady: (ready: boolean) => connection.send('room.ready.set', { ready }),
      updateMaxPlayers: (maxPlayers: number) =>
        connection.send('room.settings.update', { max_players: maxPlayers }),
    }),
    [connection],
  );
}
