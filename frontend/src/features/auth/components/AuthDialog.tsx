import { useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';

import alienArtwork from '@assets/auth/auth-alien.svg';
import cardsArtwork from '@assets/auth/auth-cards.svg';
import foxCornerArtwork from '@assets/auth/auth-fox-corner.svg';
import foxPeekArtwork from '@assets/auth/auth-fox-peek.svg';
import mascotArtwork from '@assets/auth/auth-mascot.svg';
import { useFocusTrap } from '@shared/hooks';
import { Icon } from '@shared/ui';
import { cn } from '@shared/utils';

import * as styles from './AuthDialog.styles';
import type { AuthMode } from './AuthDialog.types';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';

const MODES: AuthMode[] = ['login', 'register'];

export interface AuthDialogProps {
  /** The form the dialog opens on. */
  initialMode: AuthMode;
  /** Closes the dialog; the page underneath stays where it was. */
  onClose: () => void;
}

/**
 * The Log In / Sign Up dialog, opened over the Landing page.
 *
 * One dialog holds both forms behind the Log In / Register tabs; switching keeps the
 * dialog open and starts the other form empty. Nothing here changes the route: only a
 * successful Log In or Sign Up moves on, to the Lobby. It follows the dialog keyboard
 * contract of the shared `Modal` — focus is trapped inside, Escape and the close button
 * close it, focus goes back to the control that opened it — but draws its own shell for
 * the design's artwork. It does not close on a backdrop click, so a stray click never
 * discards what was typed.
 */
export function AuthDialog({ initialMode, onClose }: AuthDialogProps) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const dialogRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Partial<Record<AuthMode, HTMLButtonElement | null>>>({});
  const focusFieldAfterSwitch = useRef(false);
  const id = useId();
  const other: AuthMode = mode === 'login' ? 'register' : 'login';

  useFocusTrap(dialogRef);

  // The trap lands on the first control, the close button; the form's first field is
  // where the user starts, so focus moves on to it.
  useEffect(() => {
    dialogRef.current?.querySelector('input')?.focus();
  }, []);

  useEffect(() => {
    if (!focusFieldAfterSwitch.current) return;
    focusFieldAfterSwitch.current = false;
    dialogRef.current?.querySelector('input')?.focus();
  }, [mode]);

  // The page stays still behind the dialog. Where the scrollbar takes up room, its width
  // is kept as padding so the page does not shift sideways when the scrollbar goes.
  useEffect(() => {
    const { overflow, paddingRight } = document.body.style;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;
    return () => {
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = paddingRight;
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  /** The prompt and the large button hand over to the other form's first field. */
  const switchTo = (next: AuthMode) => {
    focusFieldAfterSwitch.current = true;
    setMode(next);
  };

  // Arrow keys move between the two tabs, as a tab list does.
  const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const index = MODES.indexOf(mode);
    let next: AuthMode | undefined;
    if (event.key === 'ArrowRight') next = MODES[(index + 1) % MODES.length];
    else if (event.key === 'ArrowLeft') next = MODES[(index + MODES.length - 1) % MODES.length];
    else if (event.key === 'Home') next = MODES[0];
    else if (event.key === 'End') next = MODES[MODES.length - 1];
    if (!next) return;
    event.preventDefault();
    setMode(next);
    tabRefs.current[next]?.focus();
  };

  return createPortal(
    <div
      className={styles.backdrop}
      // A press on the backdrop would move focus to the page body, outside the trap.
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) event.preventDefault();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-subtitle`}
        tabIndex={-1}
        className={styles.dialog}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={t('auth.close')}
          className={styles.close}
        >
          <Icon name="close" />
        </button>

        <h2 id={`${id}-title`} className={styles.title}>
          {t(`auth.${mode}.title`)}
        </h2>
        <p id={`${id}-subtitle`} className={styles.subtitle}>
          {t(`auth.${mode}.subtitle`)}
        </p>

        <div className={styles.card}>
          <div role="tablist" aria-label={t('auth.modes')} className={styles.tabs}>
            <span
              aria-hidden="true"
              className={cn(styles.tabIndicatorBase, styles.tabIndicator[mode])}
            />
            {MODES.map((tabMode) => (
              <button
                key={tabMode}
                ref={(element) => {
                  tabRefs.current[tabMode] = element;
                }}
                id={`${id}-tab-${tabMode}`}
                type="button"
                role="tab"
                aria-selected={tabMode === mode}
                aria-controls={`${id}-panel`}
                tabIndex={tabMode === mode ? 0 : -1}
                onClick={() => setMode(tabMode)}
                onKeyDown={onTabKeyDown}
                className={styles.tab}
              >
                {t(`auth.${tabMode}.tab`)}
              </button>
            ))}
          </div>

          <div id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-tab-${mode}`}>
            {mode === 'login' ? <LoginForm /> : <RegisterForm />}
          </div>
        </div>

        <p className={styles.prompt}>
          {t(`auth.${mode}.switchPrompt`)}{' '}
          <button type="button" onClick={() => switchTo(other)} className={styles.promptAction}>
            {t(`auth.${mode}.switchAction`)}
          </button>
        </p>
        <button
          type="button"
          onClick={() => switchTo(other)}
          className={cn(styles.switchButtonBase, styles.switchButton[mode])}
        >
          {t(`auth.${mode}.switchAction`)}
        </button>

        <img src={mascotArtwork} alt="" className={styles.mascot} />
        <img src={cardsArtwork} alt="" className={styles.cards} />
        <img src={foxPeekArtwork} alt="" className={styles.foxPeek} />
        <img src={alienArtwork} alt="" className={styles.alien} />
        <img src={foxCornerArtwork} alt="" className={styles.foxCorner} />
      </div>
    </div>,
    document.body,
  );
}
