import { Outlet } from 'react-router-dom';

import { ConnectionOverlay } from '@features/room/components/ConnectionOverlay';

import { Footer } from './Footer';

/**
 * Room and Game shell — one layout, because Room Waiting, Countdown, In-Game and the
 * Results state are all states of the same room route, not separate routes.
 */
export function GameLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">
        <Outlet />
      </main>
      <ConnectionOverlay />
      <Footer />
    </div>
  );
}
