import { useLocation } from 'react-router-dom';

import { ChatConnectionProvider } from '@app/connection/ChatConnectionProvider';
import { ChatWidget } from '@features/chat/components/ChatWidget';
import { ROUTES } from '@shared/constants';
import { useSessionStore } from '@shared/stores';

/**
 * App-level chat mount.
 *
 * The chat widget is persistent on Lobby, Room and Game only — not on
 * the public routes. Mounting it here rather than inside a feature keeps it alive
 * across those screens (including while a profile modal is open) and stops features
 * from importing each other to render it.
 */
function isChatRoute(pathname: string): boolean {
  return pathname === ROUTES.lobby || pathname.startsWith('/room/');
}

export function ChatMount() {
  const { pathname } = useLocation();
  const status = useSessionStore((state) => state.status);

  if (status !== 'AUTHENTICATED' || !isChatRoute(pathname)) return null;

  return (
    <ChatConnectionProvider>
      <ChatWidget />
    </ChatConnectionProvider>
  );
}
