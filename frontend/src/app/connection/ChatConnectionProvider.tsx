import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';

import { useInviteStore } from '@features/lobby/store/inviteStore';
import { useConnectionStore } from '@shared/stores';
import { ChatConnection } from '@shared/websocket';

import { ChatConnectionContext } from './chatConnectionContext';

/**
 * Owner of the per-user chat socket.
 *
 * Separate from the room socket by contract (`/ws/chat` is not room-scoped), but owned
 * at the same app level so a single connection serves Lobby, Room and Game without any
 * feature opening its own.
 */
export function ChatConnectionProvider({ children }: { children: ReactNode }) {
  const setChatStatus = useConnectionStore((state) => state.setChatStatus);
  const [connection, setConnection] = useState<ChatConnection | null>(null);

  useEffect(() => {
    const instance = new ChatConnection({
      onStatusChange: (status, reason) => setChatStatus(status, reason),
      onInvite: (event) => useInviteStore.getState().receive(event),
      // TODO(chat): forward `chat.message.new` and send-acks to the chat store.
    });

    setConnection(instance);
    instance.connect();

    return () => {
      instance.disconnect();
      setConnection(null);
    };
  }, [setChatStatus]);

  if (!connection) return null;

  return (
    <ChatConnectionContext.Provider value={connection}>{children}</ChatConnectionContext.Provider>
  );
}
