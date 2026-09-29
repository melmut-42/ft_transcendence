/**
 * The Players Online list in Room Discovery: the user's friends who are online now.
 *
 * `GET /api/friends` carries live presence, read fresh on every call; the server does not
 * push presence changes, so the list is as current as its last load. It loads when Room
 * Discovery opens and again on Try again after a failure.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import type { Friend } from '@shared/types';

import { listFriends } from '../api';
import { useFriendsStore } from '../store/friendsStore';

export type OnlineFriendsStatus = 'LOADING' | 'READY' | 'ERROR';

export function useOnlineFriends() {
  const friends = useFriendsStore((state) => state.friends);
  const setFriends = useFriendsStore((state) => state.setFriends);
  const [status, setStatus] = useState<OnlineFriendsStatus>('LOADING');
  const mounted = useRef(true);

  const load = useCallback(async () => {
    setStatus('LOADING');
    try {
      const { friends: list, friend_count: count } = await listFriends();
      if (!mounted.current) return;
      setFriends(list, count);
      setStatus('READY');
    } catch {
      if (mounted.current) setStatus('ERROR');
    }
  }, [setFriends]);

  useEffect(() => {
    mounted.current = true;
    void load();
    return () => {
      mounted.current = false;
    };
  }, [load]);

  const online: Friend[] = friends.filter((friend) => friend.is_online);

  return { online, status, retry: load };
}
