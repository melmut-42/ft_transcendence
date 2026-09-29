import { Trans, useTranslation } from 'react-i18next';

import type { Game } from '@shared/types';
import { cn } from '@shared/utils';

import { isGameOver } from '../model/gameView';
import * as styles from './TurnHeading.styles';

/**
 * RED TEAM'S TURN — whose turn it is, from the server's `current_turn`. Once the match is
 * over it names the winner instead. On the desktop board only the team's name takes the
 * team's color; phones and tablets color the whole line.
 */
export function TurnHeading({ game, className }: { game: Game; className?: string }) {
  const { t } = useTranslation();
  const over = isGameOver(game);
  const team = over && game.winner ? game.winner : game.current_turn.team;

  return (
    <h1 aria-live="polite" className={cn(styles.heading, styles.compactTone[team], className)}>
      {over && game.winner ? (
        <span className={styles.wideTone[team]}>
          {t('game.results.wins', { team: t(`game.team.${team}`) })}
        </span>
      ) : (
        <Trans
          i18nKey="game.turn.title"
          values={{ team: t(`game.team.${team}`) }}
          components={{ team: <span className={styles.wideTone[team]} /> }}
        />
      )}
    </h1>
  );
}
