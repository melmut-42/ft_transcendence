import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { ROUTES } from '@shared/constants';
import { useSessionStore } from '@shared/stores';

/**
 * Guard for authenticated routes.
 *
 * Bootstrap has already resolved the session by the time this renders, so an
 * `UNKNOWN` status here would be a bug rather than a loading state.
 */
export function RequireAuth() {
  const status = useSessionStore((state) => state.status);
  const location = useLocation();

  if (status !== 'AUTHENTICATED') {
    return <Navigate to={ROUTES.login} replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
