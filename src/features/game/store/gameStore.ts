/**
 * Game domain store — the authoritative game state as the server projected it for
 * this recipient.
 *
 * Two rules this store exists to enforce:
 *   - the frontend never computes a winner; only `game.ended` or a `FINISHED` snapshot
 *     is terminal;
 *   - an Operative's projection has `color: null` on unrevealed cards, and no code may
 *     treat that absence as something to fill in.
 *
 * It is fed from the same room connection as the room store — Game opens no socket.
 */

import { create } from 'zustand';

import type { Game } from '@shared/types';

interface GameState {
  game: Game | null;

  applyGame: (game: Game | null) => void;
  clear: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  game: null,

  // TODO(game): add the per-event reducers (clue submitted, card revealed, turn
  // changed, score updated, game ended).
  applyGame: (game) => set({ game }),
  clear: () => set({ game: null }),
}));
