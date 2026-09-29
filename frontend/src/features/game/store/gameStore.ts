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

import type { CurrentTurn, Game, RoomServerEvent } from '@shared/types';

interface GameState {
  game: Game | null;
  /**
   * Who left a match that ended in `PLAYER_FORFEIT`, from the `game.ended` event. The
   * snapshot does not carry it, so after a reload the result is shown without the name.
   */
  forfeitedBy: number | null;

  applyGame: (game: Game | null) => void;
  /** Apply one room-stream event; non-game events are ignored. */
  applyEvent: (event: RoomServerEvent) => void;
  clear: () => void;
}

/**
 * Apply a turn update from an event. An event may carry only part of the turn (the clue
 * event, for one, repeats the clue beside `current_turn` rather than inside it), so the
 * fields it leaves out keep their value, and a turn waiting for its clue never shows the
 * previous one.
 */
function nextTurn(previous: CurrentTurn, update: Partial<CurrentTurn>): CurrentTurn {
  const merged: CurrentTurn = { ...previous, ...update };
  return merged.phase === 'WAITING_FOR_CLUE' ? { ...merged, clue: null } : merged;
}

export const useGameStore = create<GameState>((set, get) => ({
  game: null,
  forfeitedBy: null,

  applyGame: (game) => set({ game }),

  applyEvent: (event) => {
    const { game } = get();
    switch (event.type) {
      case 'room.state':
      case 'game.started':
      case 'game.state': {
        const next = event.payload.room.game;
        const sameGame = next !== null && next.game_id === game?.game_id;
        set({ game: next, forfeitedBy: sameGame ? get().forfeitedBy : null });
        return;
      }
      case 'game.clue.submitted': {
        if (!game) return;
        const { clue, guesses_remaining: guesses, current_turn: turn } = event.payload;
        set({
          game: {
            ...game,
            current_turn: nextTurn(game.current_turn, {
              ...turn,
              clue,
              guesses_remaining: guesses,
            }),
          },
        });
        return;
      }
      case 'game.card.revealed': {
        if (!game) return;
        const { card } = event.payload;
        set({
          game: {
            ...game,
            score: event.payload.score,
            current_turn: nextTurn(game.current_turn, event.payload.current_turn),
            board: game.board.map((c) => (c.card_id === card.card_id ? card : c)),
            winner: event.payload.winner ?? game.winner,
            end_reason: event.payload.end_reason ?? game.end_reason,
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
            game: {
              ...game,
              current_turn: nextTurn(game.current_turn, event.payload.current_turn),
              score: event.payload.score,
            },
          });
        }
        return;
      case 'game.ended': {
        if (!game) return;
        const { revealed_card: revealed } = event.payload;
        set({
          forfeitedBy: event.payload.abandoned_by_user_id ?? null,
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

  clear: () => set({ game: null, forfeitedBy: null }),
}));
