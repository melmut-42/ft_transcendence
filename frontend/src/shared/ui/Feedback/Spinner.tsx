import { cn } from '@shared/utils';

export type SpinnerSize = 'sm' | 'md' | 'lg';

export interface SpinnerProps {
  size?: SpinnerSize;
  /**
   * What is loading, announced to assistive technology. Without one the ring is
   * decorative and hidden from it, for a spinner that sits beside its own visible text.
   */
  label?: string;
  className?: string;
}

const sizeStyles: Record<SpinnerSize, string> = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-(length:--stroke-heavy)',
  lg: 'h-12 w-12 border-4',
};

/**
 * Indeterminate progress ring. Under `prefers-reduced-motion` the rotation stops and
 * the ring stays as a static indicator, which the base stylesheet takes care of.
 */
export function Spinner({ size = 'md', label, className }: SpinnerProps) {
  return (
    <span
      {...(label ? { role: 'status', 'aria-label': label } : { 'aria-hidden': true })}
      className={cn(
        'inline-block shrink-0 animate-spin rounded-pill border-surface-sunken border-t-primary',
        sizeStyles[size],
        className,
      )}
    />
  );
}
