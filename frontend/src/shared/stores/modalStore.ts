/**
 * App-level modal state.
 *
 * The profile is a modal, not a route, and it opens from Lobby, Room and Game. Routing
 * the request through this store is what keeps those features from importing each
 * other: a caller publishes an intent, and the app-level `ModalHost` renders it.
 */

import { create } from 'zustand';

/** Extend as further app-level modals appear. */
export type ModalRequest = { kind: 'profile'; userId: number };

interface ModalState {
  active: ModalRequest | null;
  open: (request: ModalRequest) => void;
  close: () => void;
}

export const useModalStore = create<ModalState>((set) => ({
  active: null,
  open: (active) => set({ active }),
  close: () => set({ active: null }),
}));

/** Convenience for the common case, usable from any feature. */
export const openProfileModal = (userId: number): void =>
  useModalStore.getState().open({ kind: 'profile', userId });
