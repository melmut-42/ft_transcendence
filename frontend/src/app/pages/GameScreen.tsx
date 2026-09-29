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
  ResultReason,
  ResultsDialog,
  WinnerHeadline,
} from '@features/game/components/ResultsDialog';
import type { MatchResult } from '@features/game/components/ResultsDialog';
import { ScoreBoard } from '@features/game/components/ScoreBoard';
import { TeamStatusCard, TeamSummary } from '@features/game/components/TeamStatus';
import { TurnHeading } from '@features/game/components/TurnHeading';
import { useGameActions } from '@features/game/hooks/useGameActions';
import { gameStage, isGameOver } from '@features/game/model/gameView';
import { lineupOf } from '@features/game/model/lineup';
import type { GameStage } from '@features/game/model/gameView';
import { useGameStore } from '@features/game/store/gameStore';
import { useSessionStore } from '@shared/stores';
import type { Game, Room } from '@shared/types';
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
  onShowResults,
  onBackToLobby,
  leaving,
}: {
  game: Game;
  stage: GameStage;
  role: 'SPYMASTER' | 'OPERATIVE' | null;
  actions: ReturnType<typeof useGameActions>;
  result: MatchResult | null;
  onShowResults: () => void;
  onBackToLobby: () => void;
  leaving: boolean;
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
    case 'GAME_OVER':
      return result ? (
        <StatusPanel
          tone="strong"
          title={<WinnerHeadline winner={result.winner} />}
          body={<ResultReason result={result} />}
          className={styles.overPanel}
          actionClassName={styles.overAction}
          action={
            <div className={styles.overActions}>
              <button type="button" onClick={onShowResults} className={styles.overSecondary}>
                {t('game.results.showResults')}
              </button>
              <button
                type="button"
                onClick={onBackToLobby}
                disabled={leaving}
                aria-busy={leaving || undefined}
                className={styles.overPrimary}
              >
                {t(leaving ? 'room.leave.leaving' : 'game.results.backToLobby')}
              </button>
            </div>
          }
        />
      ) : null;
  }
}

/**
 * The Game Board: one screen for every state of the match, for Spymasters and Operatives
 * alike. What it draws follows the server's game state and the player's own seat — whose
 * turn it is, the phase, the clue, the guesses left, the board as the server projected it
 * for this player, the score and the result. Every action goes to the server, and the
 * screen changes only when the server's events arrive, so all players converge on the
 * same match. A refresh or a reconnect rebuilds it from the fresh snapshot.
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
}: {
  room: Room;
  game: Game;
  leaving: boolean;
  onLeave: () => void;
}) {
  const { t } = useTranslation();
  const userId = useSessionStore((state) => state.user?.user_id);
  const forfeitedById = useGameStore((state) => state.forfeitedBy);
  const actions = useGameActions();
  const { dismissFeedback } = actions;

  const me = room.players.find((p) => p.user_id === userId) ?? null;
  const seat = { team: me?.team ?? null, role: me?.role ?? null };
  const stage = gameStage(game, seat);
  const spymasterLayout = stage === 'CLUE' || stage === 'CLUE_SENT';
  const avatarFor = usePlayerAvatars(room.players.map((p) => p.user_id));
  const red = useMemo(() => lineupOf(room.players, 'RED'), [room.players]);
  const blue = useMemo(() => lineupOf(room.players, 'BLUE'), [room.players]);

  // A player who leaves drops out of the member list, but the result still names them.
  const [names, setNames] = useState<ReadonlyMap<number, string>>(() => new Map());
  if (room.players.some((p) => names.get(p.user_id) !== p.username)) {
    setNames(new Map([...names, ...room.players.map((p) => [p.user_id, p.username] as const)]));
  }

  const over = isGameOver(game);
  const result: MatchResult | null =
    over && game.winner
      ? {
          winner: game.winner,
          reason: game.end_reason,
          score: game.score,
          forfeitedBy: forfeitedById === null ? null : (names.get(forfeitedById) ?? null),
        }
      : null;

  const [resultsDismissed, setResultsDismissed] = useState<number | null>(null);
  const resultsOpen = result !== null && resultsDismissed !== game.game_id;

  // A server answer belongs to the turn it was sent in; a new turn starts clean.
  const turnKey = `${game.current_turn.team}:${game.current_turn.phase}`;
  useEffect(() => {
    dismissFeedback();
  }, [turnKey, dismissFeedback]);

  const roleBadge = seat.role ? t(`room.ready.role.${seat.role}`) : undefined;

  return (
    <main className={styles.page}>
      <div className={styles.stage}>
        <header className={styles.header}>
          <button
            type="button"
            onClick={onLeave}
            aria-haspopup={over ? undefined : 'dialog'}
            aria-label={t(over ? 'game.results.backToLobby' : 'game.leave')}
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
            <TeamStatusCard lineup={red} avatarFor={avatarFor} className={styles.teamCard} />
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
                onShowResults={() => setResultsDismissed(null)}
                onBackToLobby={onLeave}
                leaving={leaving}
              />
              <ActionFeedback actions={actions} action="guess" className={styles.guessFeedback} />
              <GameBoard game={game} stage={stage} role={seat.role} actions={actions} />
            </div>
            <TeamStatusCard lineup={blue} avatarFor={avatarFor} className={styles.teamCard} />
          </div>
        </div>

        <div className={styles.summaries}>
          <TeamSummary lineup={red} />
          <TeamSummary lineup={blue} />
        </div>
      </div>

      {resultsOpen && result && (
        <ResultsDialog
          result={result}
          leaving={leaving}
          onBackToLobby={onLeave}
          onViewBoard={() => setResultsDismissed(game.game_id)}
        />
      )}
    </main>
  );
}
