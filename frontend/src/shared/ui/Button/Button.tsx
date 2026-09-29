import { cn } from '@shared/utils';

import { baseStyles, sizeStyles, variantStyles } from './Button.styles';
import type { ButtonProps } from './Button.types';

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  className,
  disabled,
  type = 'button',
  theme = 'fill',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(baseStyles[theme], variantStyles[theme][variant], sizeStyles[size], className)}
      {...props}
    >
      {loading ? 'Loading…' : children}
    </button>
  );
}
