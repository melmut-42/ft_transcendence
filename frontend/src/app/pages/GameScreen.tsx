import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ProfileMenu } from '@features/profile/components/ProfileMenu';
import { usePlayerAvatars } from '@features/profile/hooks/usePlayerAvatars';
import {
  ActionFeedback,
  ClueForm,
  ClueSentPanel,
  ClueText,
  PassButton,
  StatusPanel,
} from '@features/game/components/CluePanel';
import { GameBoard } from '@features/game/components/GameBoard';
import {
  DecisionNote,
  ResultReason,
  ResultsDialog,
  WinnerHeadline,
} from '@features/game/components/ResultsDialog';
import type { MatchResult, ResultDecision } from '@features/game/components/ResultsDialog';
import { ScoreBoard } from '@features/game/components/ScoreBoard';
import { TeamStatusCard, TeamSummary } from '@features/game/components/TeamStatus';
import { TurnHeading } from '@features/game/components/TurnHeading';
import { useGameActions } from '@features/game/hooks/useGameActions';
import { gameStage, isGameOver } from '@features/game/model/gameView';
import { lineupOf } from '@features/game/model/lineup';
import type { GameStage } from '@features/game/model/gameView';
import { KickDialog } from '@features/room/components/RoomOverlays';
import { Spectators } from '@features/room/components/TeamPanel';
import { useKickMember } from '@features/room/hooks/useKickMember';
import { useReturnToLobby } from '@features/room/hooks/useReturnToLobby';
import { useRoomStore } from '@features/room/store/roomStore';
import { useSecondsUntil } from '@shared/hooks';
import { useSessionStore } from '@shared/stores';
import type { Game, Room, RoomMember, RoomRole } from '@shared/types';
import { Icon } from '@shared/ui';
import { cn } from '@shared/utils';

import * as styles from './GameScreen.styles';

/** The panel above the board for the player's stage. */
function StagePanel({
  game,
  stage,
  role,
  actions,
  result,
  decision,
  onShowResults,
}: {
  game: Game;
  stage: GameStage;
  role: RoomRole | null;
  actions: ReturnType<typeof useGameActions>;
  result: MatchResult | null;
  decision: ResultDecision | null;
  onShowResults: () => void;
}) {
  const { t } = useTranslation();
  const { team, phase, clue, guesses_remaining: guesses } = game.current_turn;
  const teamName = t(`game.team.${team}`);

  switch (stage) {
    case 'CLUE':
      // The form lives for one clue phase, so a new turn always starts from an empty form.
      return <ClueForm actions={actions} />;
    case 'CLUE_SENT':
      return clue ? <ClueSentPanel clue={clue} guessesRemaining={guesses} /> : null;
    case 'GUESSING':
      return (
        <StatusPanel
          tone="strong"
          title={clue ? <ClueText clue={clue} /> : null}
          body={t('game.clue.guesses', { count: guesses ?? 0 })}
          action={<PassButton actions={actions} enabled={(guesses ?? 0) > 0} />}
        />
      );
    case 'WAITING_FOR_CLUE':
      return (
        <StatusPanel
          waiting
          title={t('game.status.waitingTitle')}
          body={t('game.status.waitingBody')}
          action={<PassButton actions={actions} enabled={false} />}
        />
      );
    case 'OPPONENT_TURN':
      return (
        <StatusPanel
          waiting
          title={t(
            phase === 'GUESSING' ? 'game.status.opponentGuessing' : 'game.status.opponentClue',
            { team: teamName },
          )}
          body={t(
            role === 'SPYMASTER' ? 'game.status.spymasterOpponentBody' : 'game.status.opponentBody',
          )}
          action={role === 'OPERATIVE' ? <PassButton actions={actions} enabled={false} /> : null}
        />
      );
    case 'SPECTATING':
      return (
        <StatusPanel
          tone="strong"
          title={
            phase === 'GUESSING' && clue ? (
              <ClueText clue={clue} />
            ) : (
              t('game.status.opponentClue', { team: teamName })
            )
          }
          body={t('game.status.spectatingBody')}
        />
      );
    case 'PAUSED':
      return (
        <StatusPanel
          waiting
          title={t('game.status.pausedTitle')}
          body={t('game.status.pausedBody')}
        />
      );
    case 'GAME_OVER':
      return result ? (
        <StatusPanel
          tone="strong"
          title={<WinnerHeadline winner={result.winner} />}
          body={<ResultReason result={result} />}
          className={styles.overPanel}
          actionClassName={styles.overAction}
          action={
            decision && (
              <div className={styles.overActions}>
                <button type="button" onClick={onShowResults} className={styles.overSecondary}>
                  {t('game.results.showResults')}
                </button>
                <button
                  type="button"
                  onClick={decision.onBackToLobby}
                  disabled={decision.returning || decision.leaving}
                  aria-busy={decision.returning || undefined}
                  className={styles.overPrimary}
                >
                  {t(decision.returning ? 'game.results.returning' : 'game.results.backToLobby')}
                </button>
              </div>
            )
          }
        />
      ) : null;
  }
}

/**
 * The Game Board: one screen for every state of the match, for Spymasters, Operatives and
 * spectators alike. What it draws follows the server's game state and the player's own
 * seat — whose turn it is, the phase, the clue, the guesses left, the board as the server
 * projected it for this player, the score and the result. Every action goes to the server,
 * and the screen changes only when the server's events arrive, so all players converge on
 * the same match. A refresh or a reconnect rebuilds it from the fresh snapshot.
 *
 * Once the match has a result, each player decides on their own: Back to Lobby or Exit,
 * before the server's deadline.
 *
 * Desktop draws the 1920×1080 design at 80%: the scoreboard hangs from the top edge, the
 * team cards flank the clue panel and the board. Phones and tablets stack the heading,
 * the panel and the board, with the two lineups at the foot.
 */
export function GameScreen({
  room,
  game,
  leaving,
  onLeave,
  overlaysHidden,
}: {
  room: Room;
  game: Game;
  leaving: boolean;
  onLeave: () => void;
  /** The Leave confirmation is open over the screen, so the screen's own dialogs step aside. */
  overlaysHidden: boolean;
}) {
  const { t } = useTranslation();
  const userId = useSessionStore((state) => state.user?.user_id);
  const clockOffsetMs = useRoomStore((state) => state.clockOffsetMs);
  const actions = useGameActions();
  const kick = useKickMember();
  const back = useReturnToLobby();
  const { dismissFeedback } = actions;

  const me: RoomMember | null = room.players.find((p) => p.user_id === userId) ?? null;
  const seat = { team: me?.team ?? null, role: me?.role ?? null };
  const stage = gameStage(game, seat);
  const spymasterLayout = stage === 'CLUE' || stage === 'CLUE_SENT';
  const profileAvatar = usePlayerAvatars(room.players.map((p) => p.user_id));
  const avatarFor = (id: number) =>
    room.players.find((p) => p.user_id === id)?.avatar_url || profileAvatar(id);
  const participants = useMemo(
    () => room.players.filter((p) => p.role !== 'SPECTATOR'),
    [room.players],
  );
  const red = useMemo(() => lineupOf(participants, 'RED'), [participants]);
  const blue = useMemo(() => lineupOf(participants, 'BLUE'), [participants]);
  const spectators = room.players.filter((p) => p.role === 'SPECTATOR');

  const isHost = userId !== undefined && room.host_user_id === userId;
  const onKick = isHost ? kick.request : undefined;
  const kickFor = (member: RoomMember) =>
    isHost && member.user_id !== userId ? kick.request : undefined;

  const over = isGameOver(game);
  const result: MatchResult | null =
    over && game.winner
      ? { winner: game.winner, reason: game.end_reason, score: game.score }
      : null;

  const deciding = me?.state === 'POST_GAME';
  const secondsLeft = useSecondsUntil(
    deciding ? (room.post_game?.deadline_at ?? null) : null,
    clockOffsetMs,
  );
  const decision: ResultDecision | null = deciding
    ? {
        secondsLeft,
        returning: back.status === 'RETURNING',
        returnFailed: back.status === 'FAILED',
        leaving,
        onBackToLobby: () => void back.returnToLobby(),
        onExit: onLeave,
      }
    : null;

  const [resultsDismissed, setResultsDismissed] = useState<number | null>(null);
  const resultsOpen =
    result !== null && decision !== null && resultsDismissed !== game.game_id && !overlaysHidden;

  // A server answer belongs to the turn it was sent in; a new turn starts clean.
  const turnKey = `${game.current_turn.team}:${game.current_turn.phase}`;
  useEffect(() => {
    dismissFeedback();
  }, [turnKey, dismissFeedback]);

  const roleBadge = seat.role ? t(`room.ready.role.${seat.role}`) : undefined;
  const leaveLabel = deciding ? 'game.results.exit' : 'game.leave';

  return (
    <main className={styles.page}>
      <div className={styles.stage}>
        <header className={styles.header}>
          <button
            type="button"
            onClick={onLeave}
            aria-haspopup={deciding ? undefined : 'dialog'}
            aria-label={t(leaveLabel)}
            className={styles.leave}
          >
            <Icon name="logout" />
          </button>
          <ScoreBoard score={game.score} variant="pill" className={styles.scorePill} />
          <ScoreBoard score={game.score} variant="tab" className={styles.scoreTab} />
          <ProfileMenu variant="game" badge={roleBadge} className={styles.profile} />
        </header>

        <div className={styles.center}>
          <TurnHeading game={game} className={styles.heading} />
          {spymasterLayout && (
            <p className={styles.instruction}>{t(`game.instruction.${stage}`)}</p>
          )}

          <div
            className={cn(
              styles.body,
              spymasterLayout ? styles.bodySpymaster : styles.bodyOperative,
            )}
          >
            <TeamStatusCard
              lineup={red}
              avatarFor={avatarFor}
              kickFor={kickFor}
              className={styles.teamCard}
            />
            <div
              className={cn(
                styles.column,
                spymasterLayout ? styles.columnSpymaster : styles.columnOperative,
              )}
            >
              <StagePanel
                game={game}
                stage={stage}
                role={seat.role}
                actions={actions}
                result={result}
                decision={decision}
                onShowResults={() => setResultsDismissed(null)}
              />
              {stage === 'GAME_OVER' && decision && !resultsOpen && (
                <DecisionNote decision={decision} />
              )}
              <ActionFeedback actions={actions} action="guess" className={styles.guessFeedback} />
              <GameBoard game={game} stage={stage} role={seat.role} actions={actions} />
            </div>
            <TeamStatusCard
              lineup={blue}
              avatarFor={avatarFor}
              kickFor={kickFor}
              className={styles.teamCard}
            />
          </div>
        </div>

        <div className={styles.summaries}>
          <TeamSummary lineup={red} />
          <TeamSummary lineup={blue} />
        </div>
        <Spectators
          members={spectators}
          avatarFor={avatarFor}
          selfId={userId}
          onKick={onKick}
          className={styles.spectators}
        />
      </div>

      {resultsOpen && result && decision && (
        <ResultsDialog
          result={result}
          decision={decision}
          onViewBoard={() => setResultsDismissed(game.game_id)}
        />
      )}
      {!overlaysHidden && <KickDialog kick={kick} inMatch={room.status === 'IN_GAME'} />}
    </main>
  );
}
