import type { ButtonHTMLAttributes } from 'react';
import type { IconName } from '@shared/ui/Icon'

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'cta' | 'muted';
export type ButtonTheme = 'fill' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  theme?: ButtonTheme;
}

export interface ButtonIconProps extends ButtonProps {
	icon: IconName;
}
