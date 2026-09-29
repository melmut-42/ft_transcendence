import type { CardColor } from '@shared/types';

/**
 * Class recipe for the board tile, matching the design system's word cards.
 *
 * A hidden card is the muted tile with its inner face; a revealed card takes its
 * affiliation's fill and a light inner ring. Hover only darkens the border and lifts the
 * tile, pressing puts it back down, and selection is the heavy primary border with the
 * primary glow — the three never look alike.
 */
export const cardBase: string =
  'group relative flex aspect-19/21 w-full items-center justify-center overflow-hidden ' +
  'rounded-lg p-2 text-center font-black uppercase leading-tight break-words ' +
  'transition-[transform,scale,box-shadow,border-color,background-color,opacity] ' +
  'duration-200 ease-pop';

export const hiddenStyles: string =
  'bg-surface-muted text-text-black shadow-word-card border-(length:--stroke-default) border-border';

export const revealedStyles: Record<CardColor, string> = {
  BLUE: 'bg-primary-sky text-surface shadow-team-a',
  RED: 'bg-secondary-deep text-surface shadow-team-b',
  NEUTRAL: 'bg-surface text-text shadow-panel border-(length:--stroke-medium) border-text-disabled',
  ASSASSIN: 'bg-card-danger text-error shadow-danger',
};

/** Tint the spymaster sees on a card that is still hidden from the operatives. */
export const hintStyles: Record<CardColor, string> = {
  BLUE: 'border-primary-sky',
  RED: 'border-secondary-deep',
  NEUTRAL: 'border-text-disabled',
  ASSASSIN: 'border-card-danger',
};

/** The inner ring: light on a revealed team card, raised on a hidden one. */
export const ringStyles: Record<CardColor | 'HIDDEN', string> = {
  HIDDEN: 'border-surface-raised',
  BLUE: 'border-surface/90',
  RED: 'border-surface/90',
  NEUTRAL: 'border-surface-sunken',
  ASSASSIN: 'border-surface/25',
};

export const interactiveStyles: string =
  'cursor-pointer hover:border-text-ink motion-safe:hover:-translate-y-1 ' +
  'motion-safe:hover:scale-105 hover:z-1 hover:shadow-card ' +
  'active:translate-y-0 motion-safe:active:scale-98 active:shadow-word-card ' +
  'active:duration-75 active:ease-press';

export const selectedStyles: string =
  'border-(length:--stroke-heavy) border-primary shadow-soft ring-4 ring-primary-light';
