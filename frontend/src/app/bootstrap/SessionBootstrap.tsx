import { useEffect } from 'react';
import type { ReactNode } from 'react';

import { fetchSession, refreshSession } from '@features/auth/api';
import { ApiError, setRefreshHandler } from '@shared/api';
import { useSessionStore } from '@shared/stores';

/**
 * Session bootstrap gate.
 *
 * Two jobs, both application-level rather than feature-level:
 *   1. install the silent-refresh handler on the shared REST client, so any `401`
 *      retries once after `POST /api/auth/refresh` instead of logging the user out;
 *   2. read `GET /api/auth/session` once before the router renders, so guards never
 *      redirect on a session that is only still `UNKNOWN`.
 *
 * `active_room_id` from that response is the authoritative route-recovery input — the
 * screen after a refresh is derived from server membership, never from the reloaded URL.
 * Deriving and navigating to that screen is routing work built on top of this gate.
 */
export function SessionBootstrap({ children }: { children: ReactNode }) {
  const status = useSessionStore((state) => state.status);

  useEffect(() => {
    let cancelled = false;

    setRefreshHandler(async () => {
      try {
        await refreshSession();
        return true;
      } catch {
        // SESSION_EXPIRED: the refresh credential itself is dead — log in again.
        useSessionStore.getState().setAnonymous();
        return false;
      }
    });

    void (async () => {
      try {
        const session = await fetchSession();
        if (!cancelled) useSessionStore.getState().setSession(session);
      } catch (error) {
        // A 401 here simply means "no usable session", which is the anonymous state.
        if (!cancelled && error instanceof ApiError) {
          useSessionStore.getState().setAnonymous();
        }
      }
    })();

    return () => {
      cancelled = true;
      setRefreshHandler(null);
    };
  }, []);

  if (status === 'UNKNOWN') {
    return <p role="status">Loading…</p>;
  }

  return <>{children}</>;
}
