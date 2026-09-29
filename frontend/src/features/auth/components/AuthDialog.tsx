import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import alienArtwork from '@assets/auth/auth-alien.svg';
import cardsArtwork from '@assets/auth/auth-cards.svg';
import foxCornerArtwork from '@assets/auth/auth-fox-corner.svg';
import foxPeekArtwork from '@assets/auth/auth-fox-peek.svg';
import mascotArtwork from '@assets/auth/auth-mascot.svg';
import { ROUTES } from '@shared/constants';
import { useFocusTrap } from '@shared/hooks';
import { Icon } from '@shared/ui';
import { cn } from '@shared/utils';

import * as styles from './AuthDialog.styles';
import type { AuthMode } from './AuthDialog.types';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';

const MODES: AuthMode[] = ['login', 'register'];

/**
 * The Log In / Sign Up dialog, opened over the Landing page by `/login` and `/register`.
 *
 * One dialog holds both forms behind the Log In / Register tabs; switching keeps the
 * dialog open and the URL unchanged, and starts the other form empty. It follows the
 * dialog keyboard contract of the shared `Modal` — focus is trapped inside, Escape and
 * the close button return to the Landing page, focus goes back to the control that
 * opened it — but draws its own shell, because the design fills the screen below
 * desktop and sets the desktop dialog on a backdrop of its own rather than the dimmed
 * overlay. It does not close on a backdrop click, so a stray click never discards what
 * was typed.
 */
export function AuthDialog({ initialMode }: { initialMode: AuthMode }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const dialogRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Partial<Record<AuthMode, HTMLButtonElement | null>>>({});
  const focusFieldAfterSwitch = useRef(false);
  const id = useId();
  const other: AuthMode = mode === 'login' ? 'register' : 'login';

  const close = useCallback(() => navigate(ROUTES.landing, { replace: true }), [navigate]);

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

  useEffect(() => {
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [close]);

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
        <button type="button" onClick={close} aria-label={t('auth.close')} className={styles.close}>
          <Icon name="close" />
        </button>

        <h2 id={`${id}-title`} className={styles.title}>
          {t(`auth.${mode}.title`)}
        </h2>
        <p id={`${id}-subtitle`} className={styles.subtitle}>
          {t(`auth.${mode}.subtitle`)}
        </p>

        <div className={cn(styles.cardBase, styles.card[mode])}>
          <div
            role="tablist"
            aria-label={t('auth.modes')}
            className={cn(styles.tabsBase, styles.tabs[mode])}
          >
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
                className={cn(styles.tabBase, styles.tab[mode])}
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
