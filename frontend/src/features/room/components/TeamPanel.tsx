import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { openProfileModal } from '@shared/stores';
import type { RoomMember } from '@shared/types';
import { Icon } from '@shared/ui';
import { cn } from '@shared/utils';

import type { TeamRoster } from '../model/readyRoom';
import * as styles from './TeamPanel.styles';

/** Resolves a member's avatar; the room snapshot itself carries none. */
export type AvatarLookup = (userId: number) => string | null;

interface MemberProps {
  member: RoomMember;
  avatarFor: AvatarLookup;
  /** The signed-in player's user id. */
  selfId: number | undefined;
  /** Whether this client's room connection is open, which is the only presence known. */
  selfOnline: boolean;
}

function MemberAvatar({
  url,
  className,
  placeholderClassName = styles.avatarPlaceholder,
}: {
  url: string | null;
  className: string;
  placeholderClassName?: string;
}) {
  const [failed, setFailed] = useState<string | null>(null);
  return (
    <span className={className}>
      {url && failed !== url ? (
        <img src={url} alt="" onError={() => setFailed(url)} className={styles.avatarImage} />
      ) : (
        <Icon name="smile" className={placeholderClassName} />
      )}
    </span>
  );
}

/**
 * One member of a team: avatar, name, host badge, role and ready state. Ready is spelled
 * out as a label with its own mark, never shown by color alone. The card opens the
 * player's profile over the room.
 */
export function PlayerCard({ member, avatarFor, selfId, selfOnline }: MemberProps) {
  const { t } = useTranslation();
  const isSelf = member.user_id === selfId;
  const tone = member.ready ? 'ready' : 'waiting';

  return (
    <button
      type="button"
      onClick={() => openProfileModal(member.user_id)}
      aria-haspopup="dialog"
      aria-label={t('room.ready.card', {
        username: member.username,
        role: t(member.role ? `room.ready.role.${member.role}` : 'room.ready.role.none'),
        status: t(`room.ready.status.${tone}`),
        host: member.is_host ? t('room.ready.hostSuffix') : '',
        you: isSelf ? t('room.ready.youSuffix') : '',
      })}
      className={cn(styles.card, isSelf && member.team && styles.selfTone[member.team])}
    >
      <span className={styles.avatarFrame}>
        <MemberAvatar url={avatarFor(member.user_id)} className={styles.avatar} />
        {isSelf && selfOnline && <span aria-hidden="true" className={styles.onlineDot} />}
      </span>

      <span aria-hidden="true" className={styles.details}>
        <span className={styles.nameRow}>
          <span title={member.username} className={styles.name}>
            {member.username}
          </span>
          {member.is_host && <span className={styles.hostBadge}>{t('room.ready.host')}</span>}
        </span>
        <span className={cn(styles.roleBadge, !member.role && styles.roleBadgeEmpty)}>
          {member.role && (
            <Icon
              name={member.role === 'SPYMASTER' ? 'profile' : 'search'}
              className={styles.roleIcon}
            />
          )}
          {t(member.role ? `room.ready.role.${member.role}` : 'room.ready.role.none')}
        </span>
      </span>

      <span aria-hidden="true" className={cn(styles.readyBadge, styles.readyTone[tone])}>
        <span className={cn(styles.readyMark, styles.readyMarkTone[tone])}>
          <Icon name={member.ready ? 'check' : 'timer'} />
        </span>
        {t(`room.ready.status.${tone}`)}
      </span>
    </button>
  );
}

function EmptySeat() {
  const { t } = useTranslation();
  return (
    <li className={styles.emptySeat}>
      <span aria-hidden="true" className={styles.emptyAvatar} />
      <span className={styles.emptyLabel}>{t('room.ready.emptySeat')}</span>
    </li>
  );
}

/** A team's panel: its members in join order, then the seats it still needs. */
export function TeamPanel({
  roster,
  className,
  ...member
}: Omit<MemberProps, 'member'> & { roster: TeamRoster; className?: string }) {
  const { t } = useTranslation();
  const titleId = useId();

  return (
    <section
      aria-labelledby={titleId}
      className={cn(styles.panel, styles.panelTone[roster.team], className)}
    >
      <h2 id={titleId} className={cn(styles.header, styles.headerTone[roster.team])}>
        {t(`room.ready.team.${roster.team}`)}
      </h2>
      <ul className={styles.list}>
        {roster.members.map((m) => (
          <li key={m.user_id}>
            <PlayerCard member={m} {...member} />
          </li>
        ))}
        {Array.from({ length: roster.emptySeats }, (_, i) => (
          <EmptySeat key={`empty-${i}`} />
        ))}
      </ul>
    </section>
  );
}

/** Members who joined but have not picked a team yet, so nobody in the room is hidden. */
export function ChoosingPlayers({
  members,
  avatarFor,
  className,
}: {
  members: RoomMember[];
  avatarFor: AvatarLookup;
  className?: string;
}) {
  const { t } = useTranslation();
  const titleId = useId();
  if (members.length === 0) return null;

  return (
    <section aria-labelledby={titleId} className={cn(styles.choosing, className)}>
      <h2 id={titleId} className={styles.choosingTitle}>
        {t('room.ready.choosing')}
      </h2>
      <ul className={styles.choosingList}>
        {members.map((m) => (
          <li key={m.user_id} className="min-w-0">
            <button
              type="button"
              onClick={() => openProfileModal(m.user_id)}
              aria-haspopup="dialog"
              aria-label={t('lobby.players.openProfile', { username: m.username })}
              className={styles.chip}
            >
              <MemberAvatar
                url={avatarFor(m.user_id)}
                className={styles.chipAvatar}
                placeholderClassName={styles.chipPlaceholder}
              />
              <span className={styles.chipName}>{m.username}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
