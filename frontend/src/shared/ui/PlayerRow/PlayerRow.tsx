import type { ReactNode } from 'react';

import { cn } from '@shared/utils';
import { Avatar, type AvatarRing } from '@shared/ui/Avatar';
import { Badge } from '@shared/ui/Badge';
import { Icon, type IconName } from '@shared/ui/Icon';

export interface PlayerRowProps {
  /** Player name, or nothing for an unoccupied seat. */
  name?: string;
  avatarSrc?: string;
  online?: boolean;
  ring?: AvatarRing;
  /** Role label with its glyph, e.g. Operative. */
  role?: { label: string; icon: IconName };
  /** Translated HOST badge text; the badge shows only when it is set. */
  host?: string | undefined;
  /** Translated READY badge text; the badge shows only when it is set. */
  ready?: string | undefined;
  /** Compact height, for the in-game team panels. */
  compact?: boolean;
  /** Translated placeholder text for an empty seat. */
  emptyLabel: string;
  /** Lifts the row on hover, for a row the user can act on. */
  interactive?: boolean;
  className?: string;
  /** Trailing controls, e.g. a kick or invite button. */
  children?: ReactNode;
}

/**
 * One seat in a team or lobby list: avatar, name, role, and the host and ready badges.
 * Without a `name` it renders the waiting-for-player seat, which keeps the list's
 * geometry stable as players come and go.
 */
export function PlayerRow({
  name,
  avatarSrc,
  online,
  ring = 'none',
  role,
  host,
  ready,
  compact = false,
  emptyLabel,
  interactive = false,
  className,
  children,
}: PlayerRowProps) {
  const empty = name === undefined;
  const badgeSize = compact ? 'sm' : 'md';

  return (
    <div
      className={cn(
        'group/row flex w-full items-center rounded-lg border-(length:--stroke-default)',
        'transition-[transform,scale,box-shadow,border-color,background-color] duration-200 ease-pop',
        compact ? 'gap-2 p-2' : 'gap-3 p-3',
        empty ? 'border-border bg-surface-raised' : 'border-surface-sunken bg-surface shadow-card',
        interactive &&
          !empty &&
          'cursor-pointer hover:border-primary-soft hover:shadow-panel ' +
            'motion-safe:hover:-translate-y-0.5 active:translate-y-0 active:shadow-card ' +
            'motion-safe:active:scale-98 active:duration-75 active:ease-press',
        className,
      )}
    >
      <Avatar
        name={name ?? emptyLabel}
        {...(avatarSrc ? { src: avatarSrc } : {})}
        {...(online !== undefined && !empty ? { online } : {})}
        size={compact ? 'sm' : 'lg'}
        ring={empty ? 'muted' : ring}
      />

      <div className="flex min-w-0 flex-col gap-1">
        <span
          className={cn(
            'truncate font-black',
            compact ? 'text-xl' : 'text-2xl sm:text-3xl',
            empty ? 'text-text-muted' : 'text-text-ink',
          )}
        >
          {name ?? emptyLabel}
        </span>

        {role && !empty && (
          <span
            className={cn(
              'inline-flex items-center gap-1.5 self-start rounded-pill bg-surface-muted px-3 font-bold text-text-ink',
              compact ? 'h-6 text-sm' : 'h-8 text-lg',
            )}
          >
            <Icon name={role.icon} />
            {role.label}
          </span>
        )}
      </div>

      <div className={cn('ml-auto flex shrink-0 items-center', compact ? 'gap-1' : 'gap-2')}>
        {host && !empty && (
          <Badge variant="host" size={badgeSize}>
            {host}
          </Badge>
        )}
        {ready && !empty && (
          <Badge variant="ready" size={badgeSize} icon="check" circleIcon>
            {ready}
          </Badge>
        )}
        {children}
      </div>
    </div>
  );
}
