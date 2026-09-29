import { cn } from '@shared/utils';

import { iconBaseStyles, iconSizeStyles, variantStyles } from './Button.styles';
import type { ButtonIconProps } from './Button.types';
import { Icon } from '../Icon';

export function ButtonIcon({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  className,
  disabled,
  type = 'button',
  theme = 'fill',
  icon,
  ...props
}: ButtonIconProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(iconBaseStyles[theme], variantStyles[theme][variant], iconSizeStyles[size], className)}
      {...props}
    >
      <Icon name={icon}/>
    </button>
  );
}
