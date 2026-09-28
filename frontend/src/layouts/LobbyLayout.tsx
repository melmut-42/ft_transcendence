import { Outlet } from 'react-router-dom';

import { Footer } from './Footer';

/**
 * Authenticated lobby shell. The chat widget and the profile modal are mounted at the
 * app level, so this layout only frames the page.
 */
export function LobbyLayout() {
  return (
    <div className="layout layout--lobby">
      {/* TODO(design): top navigation with the current user and profile entry. */}
      <main>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
