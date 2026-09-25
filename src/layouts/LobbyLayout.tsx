import { Outlet } from 'react-router-dom';

import { Footer } from './Footer';
import { Header } from './Header';


/**
 * Authenticated lobby shell. The chat widget and the profile modal are mounted at the
 * app level, so this layout only frames the page.
 */
export function LobbyLayout() {
  return (
    <div className="layout layout--lobby">
      {/* TODO(design): top navigation with the current user and profile entry. */}
      <Header variant="minimal" />
      <main>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
