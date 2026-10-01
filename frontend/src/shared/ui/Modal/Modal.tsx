import { useEffect, useId, useRef, type ReactNode } from 'react';

import { useFocusTrap } from '@shared/hooks';
import { cn } from '@shared/utils';
import { ButtonIcon } from '@shared/ui/Button';
import { Overlay } from '@shared/ui/Overlay';

export interface ModalProps {
  /** Dialog heading. Always present, and it names the dialog for assistive technology. */
  title: string;
  children: ReactNode;
  /** Action row at the foot of the dialog. The committing action goes last. */
  footer?: ReactNode;
  onClose: () => void;
  /** Translated name of the close button. */
  closeLabel: string;
  /** Hides the close button and ignores Escape, for a dialog that demands a choice. */
  required?: boolean;
  /** Centers the title and body, as the confirmation dialog does. */
  align?: 'start' | 'center';
  className?: string;
}

/**
 * Modal shell: backdrop, dialog surface, title, close control and an optional action row.
 *
 * It owns the dialog's keyboard contract — focus is trapped inside it, Escape closes it,
 * and focus returns to the trigger when it unmounts — and it holds the page still behind
 * itself, so a feature only supplies content.
 */
export function Modal({
  title,
  children,
  footer,
  onClose,
  closeLabel,
  required = false,
  align = 'start',
  className,
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useFocusTrap(dialogRef);

  useEffect(() => {
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
    };
  }, []);

  useEffect(() => {
    if (required) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose, required]);

  return (
    <Overlay {...(required ? {} : { onBackdropClick: onClose })}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          'relative flex max-h-[90vh] w-full max-w-lg flex-col gap-4 overflow-y-auto',
          'rounded-lg bg-surface p-4 shadow-modal motion-safe:animate-pop-in',
          align === 'center' && 'text-center',
          className,
        )}
      >
        <div className={cn('flex items-start gap-3', align === 'center' && 'justify-center')}>
          <h2 id={titleId} className={cn('text-2xl', align === 'center' ? 'w-full' : 'flex-1')}>
            {title}
          </h2>
          {!required && (
            <ButtonIcon
              icon="close"
              variant="muted"
              size="sm"
              onClick={onClose}
              aria-label={closeLabel}
              className={cn(align === 'center' && 'absolute top-4 right-4')}
            />
          )}
        </div>

        <div className="flex flex-col gap-3">{children}</div>

        {footer && (
          <div
            className={cn(
              'flex flex-wrap gap-2',
              align === 'center' ? 'justify-center' : 'justify-end',
            )}
          >
            {footer}
          </div>
        )}
      </div>
    </Overlay>
  );
}
