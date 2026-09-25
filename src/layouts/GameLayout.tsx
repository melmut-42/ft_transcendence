import { Outlet } from 'react-router-dom';

import { ConnectionOverlay } from '@features/room/components/ConnectionOverlay';

import { Footer } from './Footer';
import { Header } from './Header';

/**
 * Room and Game shell — one layout, because Room Waiting, Countdown, In-Game and the
 * Results state are all states of the same room route, not separate routes.
 */
export function GameLayout() {
  return (
    <div className="layout layout--game">
      <Header variant="minimal" />
      <main>
        <Outlet />
      </main>
      <ConnectionOverlay />
      <Footer />
    </div>
  );
}
