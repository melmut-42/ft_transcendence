import { cn } from '@shared/utils';
import { Icon } from '@shared/ui/Icon';

import {
  baseStyles,
  leadingIconStyles,
  sizeStyles,
  textSizeStyles,
  trailingIconStyles,
  variantStyles,
} from './Button.styles';
import type { ButtonProps } from './Button.types';

/**
 * The application's button.
 *
 * A loading button keeps its fill and its label and trails an ellipsis, as the design
 * system's loading state does. It stops responding to clicks while the action is in
 * flight, but it is not disabled: it keeps its place in the tab order and reports
 * itself as busy, so the label never turns into something the user did not click.
 */
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  className,
  disabled,
  type = 'button',
  theme = 'fill',
  icon,
  trailingIcon,
  block = false,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      aria-busy={loading || undefined}
      aria-disabled={loading || undefined}
      className={cn(
        baseStyles[theme],
        variantStyles[theme][variant],
        theme === 'text' ? textSizeStyles[size] : sizeStyles[size],
        block && 'w-full',
        loading && 'pointer-events-none',
        className,
      )}
      {...props}
    >
      {icon && <Icon name={icon} {...(theme === 'text' ? {} : { className: leadingIconStyles })} />}
      <span className="min-w-0 truncate">
        {children}
        {loading && <span className="motion-safe:animate-pulse">…</span>}
      </span>
      {trailingIcon && <Icon name={trailingIcon} className={trailingIconStyles} />}
    </button>
  );
}
