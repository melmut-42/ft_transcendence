import type { ButtonSize, ButtonTheme, ButtonVariant } from './Button.types';

/**
 * Class recipe for the button, matching the design system's button components and its
 * interaction state matrix.
 *
 * The base holds the shared geometry and the interaction contract, `variant` owns fill,
 * label color and elevation, and `size` owns geometry only, so the two never fight over
 * the same property. Every value resolves to a design token through the Tailwind theme.
 *
 * The states follow the matrix. Hover changes the fill, lifts the button by 2px and
 * grows its shadow by the same 2px, so the button rises from the page instead of
 * floating over a gap. Pressing drops it onto its own shadow, shrinks it a touch and
 * swaps the shadow for the pressed inset. Keyboard focus is the document-wide ring, so
 * focus and hover never look alike.
 *
 * Timing carries as much of the feel as the values do: the rise is slow enough to read
 * and overshoots slightly on `ease-pop`, while the press is immediate, because a control
 * that answers a click late reads as broken. The lift and the press are transforms, so
 * they are dropped under `prefers-reduced-motion` while the fill change stays.
 *
 * A button with no elevation of its own — the text theme, and an icon button that is not
 * filled — cannot be lifted off a shadow it does not have, so it answers with size and a
 * tint instead: it grows on hover and shrinks past its resting size when pressed, over
 * the same two durations, which reads as the same gesture in a flatter register.
 */
const interaction: string =
  'cursor-pointer select-none ' +
  'transition-[translate,scale,box-shadow,background-color,border-color,color,opacity] ' +
  'duration-200 ease-pop ' +
  'not-disabled:motion-safe:hover:-translate-y-0.5 ' +
  'not-disabled:motion-safe:active:translate-y-1 ' +
  'not-disabled:active:shadow-none ' +
  'not-disabled:active:duration-75 not-disabled:active:ease-press ' +
  'disabled:cursor-not-allowed';

const flatInteraction: string =
  'cursor-pointer select-none ' +
  'transition-[scale,background-color,border-color,color,opacity] ' +
  'duration-100 ease-in ' +
  'not-disabled:motion-safe:hover:scale-105 ' +
  'not-disabled:motion-safe:active:scale-95 ' +
  'not-disabled:active:duration-75 not-disabled:active:ease-press ' +
  'disabled:cursor-not-allowed';

const disabledFill: string =
  'disabled:bg-disabled disabled:text-text-muted disabled:shadow-button-disabled';

const disabledFlat: string = 'disabled:opacity-50';

const label: string =
  'group/button inline-flex items-center justify-center gap-2 text-center uppercase ' +
  'font-bold tracking-tight leading-tight whitespace-nowrap';

export const baseStyles: Record<ButtonTheme, string> = {
  fill: `${label} ${interaction} ${disabledFill} rounded-md border-0`,
  outline: `${label} ${interaction} ${disabledFlat} rounded-lg bg-transparent border-(length:--stroke-default)`,
  text: `${label} ${flatInteraction} ${disabledFlat} rounded-md px-2 py-1 bg-transparent border-0 normal-case`,
};

export const variantStyles: Record<ButtonTheme, Record<ButtonVariant, string>> = {
  fill: {
    primary:
      'bg-primary text-surface shadow-button-primary ' +
      'not-disabled:hover:bg-primary-bright not-disabled:hover:shadow-button-primary-hover',
    neutral:
      'bg-background text-text-black shadow-button-neutral ' +
      'not-disabled:hover:bg-surface-raised not-disabled:hover:shadow-button-neutral-hover',
    muted:
      'bg-surface-muted text-text-muted shadow-button-muted ' +
      'not-disabled:hover:bg-surface-sunken not-disabled:hover:shadow-button-muted-hover',
    danger:
      'bg-destructive text-surface shadow-button-destructive ' +
      'not-disabled:hover:bg-accent-red not-disabled:hover:shadow-button-destructive-hover',
    cta:
      'bg-cta text-text-ink shadow-button-cta ' +
      'not-disabled:hover:bg-accent-yellow not-disabled:hover:shadow-button-cta-hover',
  },
  outline: {
    primary: 'border-primary-deep text-primary-sky not-disabled:hover:bg-primary/10',
    neutral: 'border-border text-text-black not-disabled:hover:bg-surface-muted',
    muted: 'border-border text-text-muted not-disabled:hover:bg-surface-muted',
    danger: 'border-destructive text-destructive not-disabled:hover:bg-destructive/10',
    cta: 'border-cta text-text-ink not-disabled:hover:bg-cta/20',
  },
  text: {
    primary: 'text-primary-sky not-disabled:hover:bg-primary/10 not-disabled:hover:text-primary',
    neutral: 'text-text-black not-disabled:hover:bg-surface-muted not-disabled:hover:text-text-ink',
    muted: 'text-text-muted not-disabled:hover:bg-surface-muted not-disabled:hover:text-text',
    danger:
      'text-destructive not-disabled:hover:bg-destructive/10 not-disabled:hover:text-accent-red',
    cta: 'text-text-ink not-disabled:hover:bg-cta/20 not-disabled:hover:text-accent-yellow-deep',
  },
};

export const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-lg',
  md: 'h-10 px-4 text-xl',
  lg: 'h-13 px-5 text-2xl',
  xl: 'h-17 px-6 text-4xl font-black',
};

/** The text theme is a label, so it keeps the type size without the button box. */
export const textSizeStyles: Record<ButtonSize, string> = {
  sm: 'text-md',
  md: 'text-lg',
  lg: 'text-xl',
  xl: 'text-2xl',
};

/** Icon buttons are circles, sized so the touch target stays comfortable. */
export const iconSizeStyles: Record<ButtonSize, string> = {
  sm: 'h-9 w-9 text-lg',
  md: 'h-11 w-11 text-xl',
  lg: 'h-14 w-14 text-2xl',
  xl: 'h-16 w-16 text-3xl',
};

const iconBox: string = 'inline-flex shrink-0 items-center justify-center rounded-pill';

export const iconBaseStyles: Record<ButtonTheme, string> = {
  fill: `${iconBox} ${interaction} ${disabledFill} border-0 not-disabled:motion-safe:hover:scale-105`,
  outline: `${iconBox} ${flatInteraction} ${disabledFlat} bg-transparent border-(length:--stroke-default)`,
  text: `${iconBox} ${flatInteraction} ${disabledFlat} bg-transparent border-0`,
};

/**
 * Icons inside a button answer the hover as well: the leading glyph grows a little and
 * the trailing one slides toward the direction it points, which reads as the button
 * leaning into the pointer.
 *
 * Only one element in a button ever scales. A flat button scales its own box, so the
 * glyph inside it holds still — two scales on the same hover multiply into a jump, and
 * the glyph would then fight the box on the press, where the two shrink by different
 * amounts. `Button` therefore drops the leading-icon growth on the text theme, and an
 * icon button, whose glyph is its whole label, scales the box alone.
 */
export const leadingIconStyles: string =
  'transition-transform duration-200 ease-pop motion-safe:group-hover/button:scale-110';

export const trailingIconStyles: string =
  'transition-transform duration-200 ease-pop motion-safe:group-hover/button:translate-x-1';
