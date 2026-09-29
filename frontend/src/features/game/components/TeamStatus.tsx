import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { openProfileModal } from '@shared/stores';
import type { RoomMember } from '@shared/types';
import { Icon } from '@shared/ui';
import { cn } from '@shared/utils';

import type { TeamLineup } from '../model/lineup';
import * as styles from './TeamStatus.styles';

/** Resolves a member's avatar; the room snapshot itself carries none. */
export type AvatarLookup = (userId: number) => string | null;

function Player({ member, avatarFor }: { member: RoomMember; avatarFor: AvatarLookup }) {
  const { t } = useTranslation();
  const url = avatarFor(member.user_id);
  const [failed, setFailed] = useState<string | null>(null);

  return (
    <li>
      <button
        type="button"
        onClick={() => openProfileModal(member.user_id)}
        aria-haspopup="dialog"
        aria-label={t('game.roster.openProfile', { username: member.username })}
        className={styles.player}
      >
        <span className={styles.avatar}>
          {url && failed !== url ? (
            <img src={url} alt="" onError={() => setFailed(url)} className={styles.avatarImage} />
          ) : (
            <Icon name="smile" className={styles.avatarPlaceholder} />
          )}
        </span>
        <span aria-hidden="true" title={member.username} className={styles.playerName}>
          {member.username}
        </span>
      </button>
    </li>
  );
}

/**
 * A team's lineup beside the desktop board: its Operatives, then its Spymaster. Each
 * player opens their profile over the game.
 */
export function TeamStatusCard({
  lineup,
  avatarFor,
  className,
}: {
  lineup: TeamLineup;
  avatarFor: AvatarLookup;
  className?: string;
}) {
  const { t } = useTranslation();
  const tone = styles.tones[lineup.team];

  return (
    <section aria-label={t(`game.teamName.${lineup.team}`)} className={cn(styles.card, className)}>
      <h2 className={cn(styles.cardTitle, tone.title)}>{t(`game.teamName.${lineup.team}`)}</h2>
      <h3 className={cn(styles.roleLabel, tone.label)}>{t('game.roster.operatives')}</h3>
      <ul className={styles.players}>
        {lineup.operatives.map((member) => (
          <Player key={member.user_id} member={member} avatarFor={avatarFor} />
        ))}
      </ul>
      <div aria-hidden="true" className={styles.divider} />
      <h3 className={cn(styles.roleLabel, tone.label)}>{t('game.roster.spymaster')}</h3>
      <ul className={styles.players}>
        {lineup.spymasters.map((member) => (
          <Player key={member.user_id} member={member} avatarFor={avatarFor} />
        ))}
      </ul>
    </section>
  );
}

/** A team's lineup as two lines of names, at the foot of the phone and tablet board. */
export function TeamSummary({ lineup, className }: { lineup: TeamLineup; className?: string }) {
  const { t } = useTranslation();
  const names = (members: RoomMember[]) =>
    members.length ? members.map((m) => m.username).join(', ') : t('game.roster.nobody');

  return (
    <section
      aria-label={t(`game.teamName.${lineup.team}`)}
      className={cn(styles.summary, className)}
    >
      <h2 className={cn(styles.summaryTitle, styles.tones[lineup.team].summary)}>
        {t(`game.teamName.${lineup.team}`)}
      </h2>
      <p className={styles.summaryLine}>
        {t('game.roster.spymasterLine', { names: names(lineup.spymasters) })}
      </p>
      <p className={styles.summaryLine}>
        {t('game.roster.operativesLine', { names: names(lineup.operatives) })}
      </p>
    </section>
  );
}
