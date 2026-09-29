import { Outlet } from 'react-router-dom';

import { Footer } from './Footer';

/**
 * Authenticated lobby shell. The chat widget and the profile modal are mounted at the
 * app level, so this layout only frames the page.
 */
export function LobbyLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* TODO(design): top navigation with the current user and profile entry. */}
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-3 py-4 sm:px-4">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
