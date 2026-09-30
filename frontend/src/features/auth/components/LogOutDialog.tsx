import { useId } from 'react';
import { useTranslation } from 'react-i18next';

import { Dialog } from '@shared/ui';
import { cn } from '@shared/utils';

import * as styles from './LogOutDialog.styles';

/**
 * Log Out? — asked only during a match, because logging out then ends it as a forfeit
 * for the player's team. Stay, the safe choice, sits on the left and the committing Log
 * Out on the right. While the request runs the dialog cannot be dismissed, so its result
 * is always shown.
 */
export function LogOutDialog({
  pending,
  failed,
  onConfirm,
  onCancel,
}: {
  pending: boolean;
  failed: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const titleId = useId();
  const bodyId = useId();

  return (
    <Dialog
      role="alertdialog"
      labelledBy={titleId}
      describedBy={bodyId}
      closeLabel={t('auth.logOut.stay')}
      onClose={onCancel}
      closable={!pending}
      showCloseButton={false}
      className={styles.card}
    >
      <h2 id={titleId} className={styles.title}>
        {t('auth.logOut.title')}
      </h2>
      <p id={bodyId} className={styles.body}>
        {t('auth.logOut.body')}
      </p>
      {failed && (
        <p role="alert" className={styles.error}>
          {t('auth.logOut.failed')}
        </p>
      )}
      <div className={styles.actions}>
        <button
          type="button"
          onClick={onCancel}
          disabled={pending}
          className={cn(styles.button, styles.stay)}
        >
          {t('auth.logOut.stay')}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={pending}
          aria-busy={pending}
          className={cn(styles.button, styles.confirm)}
        >
          {t(pending ? 'auth.logOut.pending' : 'auth.logOut.confirm')}
        </button>
      </div>
    </Dialog>
  );
}
