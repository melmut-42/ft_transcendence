import { createContext, useContext } from 'react';

import type { ChatConnection } from '@shared/websocket';

/** Context for the per-user chat socket owned by `ChatConnectionProvider`. */
export const ChatConnectionContext = createContext<ChatConnection | null>(null);

export function useChatConnection(): ChatConnection {
  const connection = useContext(ChatConnectionContext);
  if (!connection) {
    throw new Error('useChatConnection must be used inside ChatConnectionProvider.');
  }
  return connection;
}
