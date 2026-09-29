import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { cn } from '@shared/utils';

export interface OverlayProps {
  children: ReactNode;
  /** Called when the backdrop itself is clicked. Leave it out for a blocking overlay. */
  onBackdropClick?: () => void;
  /** Stacking level: modals sit below full-screen connection overlays. */
  level?: 'modal' | 'overlay';
  className?: string;
}

/**
 * Full-screen dimmed backdrop rendered in a portal, so it is never clipped by a layout
 * ancestor. It fades in, centers whatever it is given, and owns no dialog semantics —
 * `Modal` adds those.
 */
export function Overlay({ children, onBackdropClick, level = 'modal', className }: OverlayProps) {
  return createPortal(
    <div
      className={cn(
        'fixed inset-0 flex items-center justify-center bg-overlay p-3 backdrop-blur-[2px]',
        'motion-safe:animate-fade-in',
        level === 'modal' ? 'z-(--z-modal)' : 'z-(--z-overlay)',
        className,
      )}
      onClick={
        onBackdropClick
          ? (event) => {
              if (event.target === event.currentTarget) onBackdropClick();
            }
          : undefined
      }
    >
      {children}
    </div>,
    document.body,
  );
}
