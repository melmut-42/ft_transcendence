import type { ButtonSize, ButtonTheme, ButtonVariant } from './Button.types';

/**
 * Class recipe for the button, matching the design system's button components.
 *
 * The base holds everything shared; `variant` owns fill, label color and elevation, and
 * `size` owns geometry only, so the two never fight over the same property. Every value
 * resolves to a design token through the Tailwind theme.
 */
const sharedStyle: string =
  'disabled:cursor-not-allowed disabled:bg-disabled disabled:bg-none ' +
  'disabled:text-text-muted disabled:shadow-button-disabled ' +
  'transition-all duration-40 ' +
  'not-disabled:active:translate-y-[4px] not-disabled:active:shadow-none ';

export const baseStyles: Record<ButtonTheme, string> = {
  fill:
    sharedStyle +
    'inline-flex items-center justify-center gap-2 rounded-md border-0 uppercase ' +
    'cursor-pointer font-bold tracking-tight leading-tight ',
  outline:
    sharedStyle +
    'cursor-pointer inline-flex items-center justify-center gap-2 ' +
    'rounded-full border-2 uppercase active:opacity-60 '
};

export const variantStyles: Record<ButtonTheme, Record<ButtonVariant, string>> = {
  fill: {
    primary: 'bg-primary text-surface shadow-button-primary',
    secondary: 'bg-secondary text-black shadow-button-secondary',
    danger: 'bg-destructive text-surface shadow-button-destructive',
    cta: 'bg-cta text-black shadow-button-cta',
	muted: 'bg-surface-muted text-muted shadow-button-secondary'
  },
  outline: {
    primary: 'text-primary shadow-button-primary',
    secondary: 'text-black shadow-button-secondary',
    danger: 'text-destructive shadow-button-destructive',
    cta: 'text-black border-cta shadow-button-cta',
	muted: 'text-muted shadow-button-secondary'
  }
};

export const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-l',
  md: 'h-10 px-4 text-xl',
  lg: 'h-13 px-5 text-2xl',
};

const iconSharedStyle: string =
	'rounded-full flex items-center justify-center ' +
	'cursor-pointer tracking-tight leading-tight ';

export const iconBaseStyles: Record<ButtonTheme, string> = {
  fill:
    sharedStyle + iconSharedStyle +
	'border-0 ',
  outline:
    sharedStyle + iconSharedStyle +
    'cursor-pointer tracking-tight leading-tight ' +
    'border-2 active:opacity-60 '
};

export const iconSizeStyles: Record<ButtonSize, string> = {
  sm: 'p-2 text-l',
  md: 'p-3 text-xl',
  lg: 'p-4 text-2xl',
};