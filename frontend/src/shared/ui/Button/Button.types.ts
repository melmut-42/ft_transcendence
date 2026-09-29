import type { ButtonHTMLAttributes } from 'react';

import type { IconName } from '@shared/ui/Icon';

/**
 * Emphasis, not color: `primary` is the one committing action on a screen, `neutral` the
 * safe choice beside a committing one, `muted` a low-emphasis action such as Pass,
 * `danger` a destructive action and `cta` the single large call to action.
 */
export type ButtonVariant = 'primary' | 'neutral' | 'muted' | 'danger' | 'cta';

/** `fill` is the solid button, `outline` the bordered one, `text` the label-only one. */
export type ButtonTheme = 'fill' | 'outline' | 'text';

export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Marks the action as in flight: the button is inert and the label trails an ellipsis. */
  loading?: boolean;
  theme?: ButtonTheme;
  /** Icon before the label. */
  icon?: IconName;
  /** Icon after the label. */
  trailingIcon?: IconName;
  /** Stretches the button to its container's width. */
  block?: boolean;
}

/** An icon button carries no label of its own, so it needs an `aria-label`. */
export interface ButtonIconProps extends Omit<
  ButtonProps,
  'children' | 'icon' | 'trailingIcon' | 'block'
> {
  icon: IconName;
  'aria-label': string;
}
