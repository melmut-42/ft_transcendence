import { useId } from 'react';
import { useTranslation } from 'react-i18next';

import trophyArtwork from '@assets/game/results-trophy.svg';
import type { GameEndReason, Score, Team } from '@shared/types';
import { Dialog } from '@shared/ui';
import { cn } from '@shared/utils';

import { opponentOf } from '../model/gameView';
import * as styles from './ResultsDialog.styles';

export interface MatchResult {
  winner: Team;
  reason: GameEndReason | null;
  score: Score;
  /** The player whose leaving forfeited the match, when the server named one. */
  forfeitedBy: string | null;
}

/** Why the match ended, in the words of the Results card. */
export function ResultReason({ result }: { result: MatchResult }) {
  const { t } = useTranslation();
  const winner = t(`game.team.${result.winner}`);
  const loser = t(`game.team.${opponentOf(result.winner)}`);
  switch (result.reason) {
    case 'ALL_TEAM_CARDS_REVEALED':
      return <>{t('game.results.reason.ALL_TEAM_CARDS_REVEALED', { team: winner })}</>;
    case 'ASSASSIN_REVEALED':
      return <>{t('game.results.reason.ASSASSIN_REVEALED', { team: loser })}</>;
    case 'PLAYER_FORFEIT':
      return result.forfeitedBy ? (
        <>
          {t('game.results.reason.PLAYER_FORFEIT_NAMED', {
            team: loser,
            username: result.forfeitedBy,
          })}
        </>
      ) : (
        <>{t('game.results.reason.PLAYER_FORFEIT', { team: loser })}</>
      );
    default:
      return null;
  }
}

/** `RED TEAM WINS!` */
export function WinnerHeadline({ winner }: { winner: Team }) {
  const { t } = useTranslation();
  return <>{t('game.results.wins', { team: t(`game.team.${winner}`) })}</>;
}

/**
 * MATCH OVER. It opens over the board the moment the server announces the result, names
 * the winning team and why the match ended, and shows each team's revealed cards. Every
 * value is the server's: nothing here decides a winner. Back to Lobby leaves the finished
 * room; View Final Board closes the card and leaves the board on screen.
 */
export function ResultsDialog({
  result,
  leaving,
  onBackToLobby,
  onViewBoard,
}: {
  result: MatchResult;
  leaving: boolean;
  onBackToLobby: () => void;
  onViewBoard: () => void;
}) {
  const { t } = useTranslation();
  const titleId = useId();
  const reasonId = useId();

  return (
    <Dialog
      role="alertdialog"
      labelledBy={titleId}
      describedBy={reasonId}
      closeLabel={t('game.results.viewBoard')}
      onClose={onViewBoard}
      closable={!leaving}
      showCloseButton={false}
      className={styles.card}
    >
      <p className={styles.badge}>{t('game.results.badge')}</p>
      <img src={trophyArtwork} alt="" className={styles.trophy} />
      <h2 id={titleId} className={cn(styles.headline, styles.headlineTone[result.winner])}>
        <WinnerHeadline winner={result.winner} />
      </h2>
      <p id={reasonId} className={styles.reason}>
        <ResultReason result={result} />
      </p>
      <p className={styles.scores}>
        <span className="sr-only">
          {t('game.score.label', { red: result.score.red, blue: result.score.blue })}
        </span>
        {(['RED', 'BLUE'] as const).map((team, index) => (
          <span key={team} aria-hidden="true" className="contents">
            {index === 1 && <span className={styles.separator}>—</span>}
            <span className={cn(styles.chip, styles.chipTone[team])}>
              <span className={styles.chipLabel}>{t(`game.team.${team}`)}</span>
              <span className={styles.chipScore}>
                {team === 'RED' ? result.score.red : result.score.blue}
              </span>
            </span>
          </span>
        ))}
      </p>
      <div className={styles.actions}>
        <button
          type="button"
          onClick={onBackToLobby}
          disabled={leaving}
          aria-busy={leaving || undefined}
          className={styles.primary}
        >
          {t(leaving ? 'room.leave.leaving' : 'game.results.backToLobby')}
        </button>
        <button type="button" onClick={onViewBoard} disabled={leaving} className={styles.secondary}>
          {t('game.results.viewBoard')}
        </button>
      </div>
    </Dialog>
  );
}
