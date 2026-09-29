import { cn } from '@shared/utils';

export interface SkeletonProps {
  /** Shape of the placeholder. */
  shape?: 'line' | 'block' | 'circle';
  className?: string;
}

/**
 * Placeholder block for content that is still loading. It is decorative: the surrounding
 * `LoadingState` or live region is what says that loading is in progress.
 */
export function Skeleton({ shape = 'line', className }: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'block bg-surface-sunken motion-safe:animate-pulse',
        shape === 'line' && 'h-3 w-full rounded-pill',
        shape === 'block' && 'h-12 w-full rounded-sm',
        shape === 'circle' && 'h-14 w-14 rounded-pill',
        className,
      )}
    />
  );
}

/** The player card placeholder from the design system: avatar, name, status, room. */
export function SkeletonPlayerCard({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn('flex flex-col gap-3 rounded-lg bg-surface p-4 shadow-panel', className)}
    >
      <div className="flex items-center gap-3">
        <Skeleton shape="circle" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Skeleton className="w-3/5" />
          <Skeleton className="w-2/5" />
        </div>
      </div>
      <Skeleton />
    </div>
  );
}
