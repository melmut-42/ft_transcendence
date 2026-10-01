import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useBlocker, useNavigate } from 'react-router-dom';

import { useRoomConnection } from '@app/connection/roomConnectionContext';
import { endSignedInState } from '@app/session/endSignedInState';
import { useGameStore } from '@features/game/store/gameStore';
import { LeaveRoomDialog } from '@features/room/components/RoomOverlays';
import { useLeaveRoom } from '@features/room/hooks/useLeaveRoom';
import { forgetRoomCode, recallRoomCode } from '@features/room/model/roomCode';
import { useRoomStore } from '@features/room/store/roomStore';
import { ROUTES } from '@shared/constants';
import { useConnectionStore, useSessionStore } from '@shared/stores';
import { ErrorState, LoadingState } from '@shared/ui';

import { GameScreen } from './GameScreen';
import { ReadyRoom } from './ReadyRoom';
import * as styles from './ReadyRoom.styles';

/** The room is gone for this player: it closed, or they are no longer a member. */
function RoomUnavailable() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <main className={styles.state}>
      <div role="alert" className={styles.stateCard}>
        <h1 className="text-3xl font-black normal-case">{t('room.unavailable.title')}</h1>
        <p className="text-lg font-regular text-text-muted">{t('room.unavailable.body')}</p>
        <button
          type="button"
          onClick={() => navigate(ROUTES.lobby, { replace: true })}
          className={styles.stateAction}
        >
          {t('room.unavailable.action')}
        </button>
      </div>
    </main>
  );
}

/**
 * The room route. It shows the screen that matches the server's `room.status` — the Ready
 * Room while the room waits or counts down, the Game Board once the game starts and its
 * result once it ends — so a refresh lands on the right screen from the fresh snapshot,
 * never from navigation history.
 *
 * Until the first snapshot arrives the route shows a loading state rather than an empty
 * room. A room that closed, or that the player no longer belongs to, clears the room from
 * the session and offers the way back to Room Discovery.
 *
 * Leaving is always explicit. LEAVE ROOM and LEAVE GAME ask first and tell the server, and
 * a Back or any other navigation away from the room is held for the same confirmation, so
 * nobody leaves a seat taken by nobody. A finished match has nothing left to confirm, so
 * leaving it, by Back to Lobby or by Back, tells the server and goes straight to the Lobby.
 */
export function RoomPage() {
  const { t } = useTranslation();
  const connection = useRoomConnection();
  const roomId = connection.roomId;
  const room = useRoomStore((state) => state.room);
  const game = useGameStore((state) => state.game);
  const socket = useConnectionStore((state) => state.room);
  const leave = useLeaveRoom();
  const [roomCode] = useState(() => recallRoomCode(roomId));

  const userId = useSessionStore((state) => state.user?.user_id);
  // A snapshot without the player means the server no longer counts them in the room; while
  // they are leaving on purpose, that is the leave itself arriving first.
  const removed =
    room !== null && leave.status !== 'LEAVING' && !room.players.some((p) => p.user_id === userId);
  const unavailable =
    removed ||
    room?.status === 'CLOSED' ||
    (socket.status === 'CLOSED' &&
      (socket.closeReason === 'ROOM_NOT_FOUND' || socket.closeReason === 'NOT_ROOM_MEMBER'));
  const sessionEnded = socket.status === 'CLOSED' && socket.closeReason === 'SESSION_INVALID';

  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    if (currentLocation.pathname === nextLocation.pathname) return false;
    // Read at navigation time: leaving clears the active room just before it navigates.
    const member = useSessionStore.getState().activeRoomId === roomId;
    const status = useRoomStore.getState().room?.status;
    return member && status !== undefined && status !== 'CLOSED';
  });

  useEffect(() => {
    if (!unavailable) return;
    forgetRoomCode(roomId);
    if (useSessionStore.getState().activeRoomId === roomId) {
      useSessionStore.getState().setActiveRoomId(null);
    }
  }, [roomId, unavailable]);

  // A revoked session cannot reconnect; the route guard takes the user to Log In.
  useEffect(() => {
    if (sessionEnded) endSignedInState('EXPIRED');
  }, [sessionEnded]);

  // Leaving a finished room needs no confirmation: a held navigation leaves at once.
  const { request: requestLeave, action: leaveAction } = leave;
  const blocked = blocker.state === 'blocked';
  useEffect(() => {
    if (!blocked || leaveAction.confirmation) return;
    blocker.reset?.();
    requestLeave();
  }, [blocked, blocker, leaveAction.confirmation, requestLeave]);

  const leaveOpen = leaveAction.confirmation
    ? leave.status !== 'IDLE' || blocked
    : leave.status === 'FAILED';
  const cancelLeave = () => {
    leave.cancel();
    if (blocker.state === 'blocked') blocker.reset();
  };
  const confirmLeave = () => {
    // The held navigation is dropped; leaving takes the player to Room Discovery itself.
    if (blocker.state === 'blocked') blocker.reset();
    void leave.confirm();
  };

  let screen;
  if (unavailable) {
    screen = <RoomUnavailable />;
  } else if (!room) {
    screen =
      socket.status === 'CLOSED' && !sessionEnded ? (
        <main className={styles.state}>
          <ErrorState
            title={t('room.connection.failedTitle')}
            description={t('room.connection.failedBody')}
            onRetry={() => connection.connect()}
            retryLabel={t('common.retry')}
          />
        </main>
      ) : (
        <main className={styles.state}>
          <LoadingState label={t('room.loading')} />
        </main>
      );
  } else if (room.status === 'WAITING' || room.status === 'COUNTDOWN') {
    screen = <ReadyRoom room={room} roomCode={roomCode} onLeave={leave.request} />;
  } else if (game) {
    screen = (
      <GameScreen
        room={room}
        game={game}
        leaving={leave.status === 'LEAVING'}
        onLeave={leave.request}
      />
    );
  } else {
    screen = (
      <main className={styles.state}>
        <LoadingState label={t('game.loading')} />
      </main>
    );
  }

  return (
    <>
      {screen}
      {leaveOpen && !unavailable && (
        <LeaveRoomDialog
          action={leave.action}
          status={leave.status}
          failed={leave.status === 'FAILED'}
          onConfirm={confirmLeave}
          onCancel={cancelLeave}
        />
      )}
    </>
  );
}
