import { useEffect, useMemo, useState } from 'react';
import { Outlet, useParams } from 'react-router-dom';

import { useGameStore } from '@features/game/store/gameStore';
import { useRoomStore } from '@features/room/store/roomStore';
import { useConnectionStore } from '@shared/stores';
import { RoomConnection } from '@shared/websocket';

import { RoomConnectionContext } from './roomConnectionContext';

/**
 * The one owner of the room WebSocket.
 *
 * That socket carries both `room.*` and `game.*` events, so exactly one connection
 * exists per room and both features read from it. Room and Game must never open their
 * own socket — two sockets would mean two competing views of authoritative state.
 *
 * This provider owns transport lifecycle, publishes connection status, and forwards
 * every event to the room and game stores. Leaving the room unmounts it, which closes
 * the socket and clears both stores so no stale member state survives the exit.
 */
export function RoomConnectionProvider() {
  const { roomId: roomIdParam } = useParams<{ roomId: string }>();
  const roomId = Number(roomIdParam);
  const setRoomStatus = useConnectionStore((state) => state.setRoomStatus);
  const [connection, setConnection] = useState<RoomConnection | null>(null);

  const isValidRoomId = Number.isInteger(roomId) && roomId > 0;

  useEffect(() => {
    if (!isValidRoomId) return;

    const instance = new RoomConnection(roomId, {
      onStatusChange: (status, reason) => setRoomStatus(status, reason),
      onEvent: (event) => {
        useRoomStore.getState().applyEvent(event);
        useGameStore.getState().applyEvent(event);
      },
      // A suspected gap: drop local state and reconnect for a fresh `room.state`.
      onSnapshotRequired: () => {
        instance.disconnect();
        instance.connect();
      },
    });

    setConnection(instance);
    instance.connect();

    return () => {
      instance.disconnect();
      useRoomStore.getState().clear();
      useGameStore.getState().clear();
      setConnection(null);
    };
  }, [isValidRoomId, roomId, setRoomStatus]);

  const value = useMemo(() => connection, [connection]);

  if (!isValidRoomId) {
    // ROOM_RECOVERY: an unusable room id sends the user back to the Lobby.
    // TODO(routing): redirect to the Lobby with an explanatory toast.
    return null;
  }

  if (!value) return null;

  return (
    <RoomConnectionContext.Provider value={value}>
      <Outlet />
    </RoomConnectionContext.Provider>
  );
}
