/**
 * The signed-in user's own profile, from `GET /api/users/me`.
 *
 * It feeds the profile summary in the Room Discovery header. Until it arrives, or if it
 * fails, the session's username is still known, so the header never goes blank.
 */

import { useCallback, useEffect, useState } from 'react';

import type { OwnProfile } from '@shared/types';

import { getOwnProfile } from '../api';

export type OwnProfileStatus = 'LOADING' | 'READY' | 'ERROR';

export function useOwnProfile() {
  const [profile, setProfile] = useState<OwnProfile | null>(null);
  const [status, setStatus] = useState<OwnProfileStatus>('LOADING');

  const load = useCallback(async (signal: { cancelled: boolean }) => {
    setStatus('LOADING');
    try {
      const own = await getOwnProfile();
      if (signal.cancelled) return;
      setProfile(own);
      setStatus('READY');
    } catch {
      if (!signal.cancelled) setStatus('ERROR');
    }
  }, []);

  useEffect(() => {
    const signal = { cancelled: false };
    void load(signal);
    return () => {
      signal.cancelled = true;
    };
  }, [load]);

  return { profile, status };
}
