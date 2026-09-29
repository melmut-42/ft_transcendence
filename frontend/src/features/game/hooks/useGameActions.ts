/**
 * The player's game commands — give a clue, pick a card, pass — with the feedback the
 * board shows while one is in flight and after the server turns one down.
 *
 * Nothing on the board changes when a command is sent. The clue, the revealed card, the
 * score and the next turn appear when the server's `game.*` events arrive, for this client
 * and every other one alike, so a pick that loses a race with a teammate's never shows a
 * result the server did not accept. One command runs at a time; a second press while one
 * is in flight is dropped. That lock only spares the server a repeated request — the
 * server serializes the room's commands itself.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { useRoomConnection } from '@app/connection/roomConnectionContext';
import { RoomCommandError } from '@shared/websocket';

export type GameAction = 'clue' | 'guess' | 'pass';

export interface GameFeedback {
  action: GameAction;
  /** Translation key of the message. */
  message: string;
}

/**
 * Errors that mean this client's view is behind the server's (the card was revealed, the
 * turn moved on, the match ended). The board is then rebuilt from a fresh snapshot rather
 * than patched around.
 */
const STALE_STATE = new Set([
  'CARD_ALREADY_REVEALED',
  'GAME_ALREADY_FINISHED',
  'INVALID_ROOM_STATE',
  'NOT_YOUR_TURN',
  'NO_GUESSES_REMAINING',
]);

function messageFor(error: unknown): string {
  const code = error instanceof RoomCommandError ? error.code : null;
  switch (code) {
    case 'INVALID_CLUE':
      return 'game.errors.invalidClue';
    case 'INVALID_CLUE_NUMBER':
      return 'game.errors.invalidNumber';
    case 'CARD_ALREADY_REVEALED':
      return 'game.errors.alreadyRevealed';
    case 'INVALID_CARD':
      return 'game.errors.invalidCard';
    case 'NO_GUESSES_REMAINING':
      return 'game.errors.noGuesses';
    case 'NOT_YOUR_TURN':
    case 'INVALID_ROOM_STATE':
      return 'game.errors.notYourTurn';
    case 'ROLE_FORBIDDEN':
      return 'game.errors.roleForbidden';
    case 'GAME_ALREADY_FINISHED':
      return 'game.errors.finished';
    case 'NOT_SENT':
    case 'CONNECTION_LOST':
      return 'game.errors.offline';
    default:
      return 'game.errors.generic';
  }
}

export function useGameActions() {
  const connection = useRoomConnection();
  const [pending, setPending] = useState<GameAction | null>(null);
  /** The card whose pick is on its way to the server. */
  const [pickedCard, setPickedCard] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<GameFeedback | null>(null);
  const busy = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(
    async (action: GameAction, send: () => Promise<unknown>): Promise<boolean> => {
      if (busy.current) return false;
      busy.current = true;
      setPending(action);
      setFeedback(null);
      try {
        await send();
        return true;
      } catch (error) {
        if (error instanceof RoomCommandError && STALE_STATE.has(error.code)) connection.resync();
        if (mounted.current) setFeedback({ action, message: messageFor(error) });
        return false;
      } finally {
        busy.current = false;
        if (mounted.current) {
          setPending(null);
          setPickedCard(null);
        }
      }
    },
    [connection],
  );

  return {
    pending,
    pickedCard,
    feedback,
    dismissFeedback: useCallback(() => setFeedback(null), []),
    /** Resolves `true` once the server accepted the clue. */
    submitClue: useCallback(
      (word: string, number: number) =>
        run('clue', () => connection.request('game.clue.submit', { word, number })),
      [connection, run],
    ),
    guessCard: useCallback(
      (cardId: number) => {
        if (busy.current) return;
        setPickedCard(cardId);
        void run('guess', () => connection.request('game.card.guess', { card_id: cardId }));
      },
      [connection, run],
    ),
    passTurn: useCallback(
      () => void run('pass', () => connection.request('game.turn.pass', {})),
      [connection, run],
    ),
  };
}

export type GameActions = ReturnType<typeof useGameActions>;
