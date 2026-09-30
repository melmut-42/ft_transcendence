import { useEffect, useId, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Dialog, FieldMessage, Icon } from '@shared/ui';
import { cn } from '@shared/utils';

import * as styles from './DeleteAccountDialog.styles';
import * as fieldStyles from './SettingsModal.styles';

export interface DeleteAccountDialogProps {
  /** The signed-in username, which the user types to confirm. */
  username: string;
  /** Whether the user is in a running match, which deletion removes them from. */
  inMatch: boolean;
  pending: boolean;
  failure: 'MISMATCH' | 'RATE_LIMITED' | 'FAILED' | null;
  onConfirm: (typedUsername: string) => void;
  onCancel: () => void;
}

const normalize = (value: string): string => value.trim().toLowerCase();

/**
 * Delete Account? — the destructive confirmation over Settings.
 *
 * Deletion cannot be undone, so the user types their username before the action unlocks;
 * the server checks the same value again. Cancel, the safe choice, sits on the left. While
 * the request runs the dialog cannot be dismissed, so its result is always shown; on
 * success the app leaves for Landing and this dialog goes with it.
 */
export function DeleteAccountDialog({
  username,
  inMatch,
  pending,
  failure,
  onConfirm,
  onCancel,
}: DeleteAccountDialogProps) {
  const { t } = useTranslation();
  const titleId = useId();
  const bodyId = useId();
  const inputId = useId();
  const noteId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [typed, setTyped] = useState('');
  const matches = normalize(typed) !== '' && normalize(typed) === normalize(username);

  // The field is where the user starts; the trap would otherwise land on Cancel.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (matches && !pending) onConfirm(typed);
  };

  return (
    <Dialog
      role="alertdialog"
      labelledBy={titleId}
      describedBy={bodyId}
      closeLabel={t('settings.deleteAccount.cancel')}
      onClose={onCancel}
      closable={!pending}
      showCloseButton={false}
      className={styles.card}
    >
      <span aria-hidden="true" className={styles.icon}>
        <Icon name="trash" />
      </span>
      <h2 id={titleId} className={styles.title}>
        {t('settings.deleteAccount.title')}
      </h2>
      <p id={bodyId} className={styles.body}>
        {t('settings.deleteAccount.body')}
      </p>
      {inMatch && <p className={styles.warning}>{t('settings.deleteAccount.inMatch')}</p>}

      <form onSubmit={onSubmit} noValidate className="flex w-full flex-col items-center">
        <div className={styles.field}>
          <label htmlFor={inputId} className={styles.confirmLabel}>
            <Trans
              i18nKey="settings.deleteAccount.confirmLabel"
              values={{ username }}
              components={{ name: <strong /> }}
            />
          </label>
          <div className={fieldStyles.inputWrap}>
            <Icon name="profile" className={fieldStyles.inputIcon} />
            <input
              ref={inputRef}
              id={inputId}
              type="text"
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              readOnly={pending}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              maxLength={20}
              aria-invalid={failure === 'MISMATCH' || undefined}
              aria-describedby={noteId}
              className={cn(
                fieldStyles.input,
                fieldStyles.inputStatus[failure === 'MISMATCH' ? 'error' : 'default'],
              )}
            />
          </div>
          {failure === 'MISMATCH' ? (
            <FieldMessage id={noteId} status="error" className={fieldStyles.fieldError}>
              {t('settings.deleteAccount.error.MISMATCH')}
            </FieldMessage>
          ) : (
            <p id={noteId} className={fieldStyles.hint}>
              {t('settings.deleteAccount.confirmHint')}
            </p>
          )}
        </div>

        {failure && failure !== 'MISMATCH' && (
          <p role="alert" className={styles.error}>
            {t(`settings.deleteAccount.error.${failure}`)}
          </p>
        )}

        <div className={styles.actions}>
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className={cn(styles.button, styles.cancel)}
          >
            {t('settings.deleteAccount.cancel')}
          </button>
          <button
            type="submit"
            disabled={!matches || pending}
            aria-busy={pending}
            className={cn(styles.button, styles.confirm)}
          >
            {t(pending ? 'settings.deleteAccount.pending' : 'settings.deleteAccount.confirm')}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
