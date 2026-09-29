/**
 * Class recipes for the profile summary in the Room Discovery header.
 *
 * Mobile and tablet are the base: a 44px avatar and the name. From `desktop:` it is the
 * design's card at 80% of its size, like the rest of the desktop page: 70px tall, 246px
 * wide for a short name and wider for a longer one, with the presence badge, the level and
 * the chevron.
 */

export const menu: string =
  'group/menu flex min-w-0 cursor-pointer items-center gap-[10px] rounded-pill text-left ' +
  'desktop:h-[70px] desktop:w-max desktop:min-w-[246px] desktop:max-w-[340px] ' +
  'desktop:gap-[11px] desktop:rounded-[14px] desktop:bg-surface desktop:py-[8px] ' +
  'desktop:pr-[9px] desktop:pl-[10px] desktop:shadow-[0_5px_8px_var(--color-shadow-warm-strong)] ' +
  'desktop:transition-[translate,box-shadow] desktop:duration-200 desktop:ease-pop ' +
  'desktop:hover:shadow-[0_7px_12px_var(--color-shadow-warm-strong)] ' +
  'motion-safe:desktop:hover:-translate-y-0.5';

export const avatarFrame: string = 'relative shrink-0 self-center desktop:self-start';

export const avatar: string =
  'flex size-11 items-center justify-center overflow-hidden rounded-pill ' +
  'bg-accent-yellow-deep desktop:size-[50px]';

export const avatarImage: string = 'h-full w-full object-cover';

export const avatarPlaceholder: string = 'text-2xl text-text-black desktop:text-2xl';

export const onlineDot: string =
  'absolute top-[41px] left-[44px] hidden size-[12px] rounded-pill border-2 border-surface ' +
  'bg-success-bright desktop:block';

export const details: string = 'flex min-w-0 flex-1 flex-col desktop:gap-[9px] desktop:pt-[3px]';

export const nameRow: string = 'flex min-w-0 items-center gap-[16px] desktop:gap-[12px]';

export const name: string =
  'truncate text-2xl leading-[37px] font-black text-text-ink desktop:text-[22px] ' +
  'desktop:leading-[22px]';

export const badge: string =
  'hidden h-[22px] shrink-0 items-center gap-[4px] rounded-[11px] bg-accent-mint px-[7px] ' +
  'text-[11px] leading-none font-black text-success-deep uppercase desktop:inline-flex';

export const badgeDot: string = 'size-[7px] rounded-pill bg-success-deep';

export const level: string = 'hidden text-md leading-[14px] font-bold text-text-ink desktop:block';

export const levelSkeleton: string =
  'hidden h-[11px] w-[40px] rounded-pill bg-surface-sunken motion-safe:animate-pulse ' +
  'desktop:block';

export const chevron: string =
  'hidden shrink-0 text-xl text-text-ink transition-transform duration-200 ease-pop ' +
  'motion-safe:group-hover/menu:translate-y-0.5 desktop:block';

// ---- Ready Room sidebar ----

/**
 * The plain summary at the top of the Ready Room sidebar: a 74px avatar beside the name
 * and the presence line, with no card, level or chevron. The sidebar shows from
 * `desktop:` only, at 80% of the design's size like the rest of that layout.
 */
export const plain = {
  menu:
    'group/menu flex min-w-0 cursor-pointer items-center gap-[10px] rounded-pill pr-[10px] ' +
    'text-left transition-[translate] duration-200 ease-pop motion-safe:hover:-translate-y-0.5',
  avatar:
    'flex size-[74px] shrink-0 items-center justify-center overflow-hidden rounded-pill ' +
    'bg-accent-yellow-deep',
  avatarPlaceholder: 'text-4xl text-text-black',
  details: 'flex min-w-0 flex-col gap-[9px]',
  name: 'truncate text-[22px] leading-[22px] font-black text-text-ink',
  status: 'flex items-center gap-[8px] text-[16px] leading-[16px] font-regular text-text-ink',
  statusDot: 'size-[11px] shrink-0 rounded-pill bg-success-soft',
};
