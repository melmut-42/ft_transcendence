/**
 * Friends store — persistent social state read over REST.
 *
 * `is_online` is live presence maintained by the backend; the frontend displays it and
 * never infers it from its own socket state.
 */

import { create } from 'zustand';

import type { Friend } from '@shared/types';

interface FriendsState {
  friends: Friend[];
  friendCount: number;

  setFriends: (friends: Friend[], friendCount: number) => void;
  clear: () => void;
}

export const useFriendsStore = create<FriendsState>((set) => ({
  friends: [],
  friendCount: 0,

  setFriends: (friends, friendCount) => set({ friends, friendCount }),
  clear: () => set({ friends: [], friendCount: 0 }),
}));
