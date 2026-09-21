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

import type { Game, RoomServerEvent } from '@shared/types';

interface GameState {
  game: Game | null;

  applyGame: (game: Game | null) => void;
  /** Apply one room-stream event; non-game events are ignored. */
  applyEvent: (event: RoomServerEvent) => void;
  clear: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  game: null,

  applyGame: (game) => set({ game }),

  applyEvent: (event) => {
    const { game } = get();
    switch (event.type) {
      case 'room.state':
      case 'game.started':
      case 'game.state':
        set({ game: event.payload.room.game });
        return;
      case 'game.clue.submitted':
        if (game) set({ game: { ...game, current_turn: event.payload.current_turn } });
        return;
      case 'game.card.revealed': {
        if (!game) return;
        const { card } = event.payload;
        set({
          game: {
            ...game,
            score: event.payload.score,
            current_turn: event.payload.current_turn,
            board: game.board.map((c) => (c.card_id === card.card_id ? card : c)),
          },
        });
        return;
      }
      case 'game.score.updated':
        if (game) set({ game: { ...game, score: event.payload.score } });
        return;
      case 'game.turn.changed':
        if (game) {
          set({
            game: { ...game, current_turn: event.payload.current_turn, score: event.payload.score },
          });
        }
        return;
      case 'game.ended': {
        if (!game) return;
        const { revealed_card: revealed } = event.payload;
        set({
          game: {
            ...game,
            winner: event.payload.winner,
            end_reason: event.payload.end_reason,
            score: event.payload.score,
            finished_at: event.payload.finished_at,
            current_turn: { ...game.current_turn, phase: 'GAME_OVER' },
            board: revealed
              ? game.board.map((c) => (c.card_id === revealed.card_id ? revealed : c))
              : game.board,
          },
        });
        return;
      }
      default:
        return;
    }
  },

  clear: () => set({ game: null }),
}));
