import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { openProfileModal, useSessionStore } from '@shared/stores';
import { Icon } from '@shared/ui';
import { cn } from '@shared/utils';

import { useOwnProfile } from '../hooks/useOwnProfile';
import * as styles from './ProfileMenu.styles';

/**
 * The signed-in player's summary in the Room Discovery header: avatar, name, presence and
 * level. It opens the player's own profile over the page.
 *
 * Mobile and tablet show the avatar and the name at the head of the page; the desktop layout
 * shows the full card in the top-right corner.
 */
export function ProfileMenu({ className }: { className?: string }) {
  const { t } = useTranslation();
  const session = useSessionStore((state) => state.user);
  const { profile, status } = useOwnProfile();
  const [imageFailed, setImageFailed] = useState(false);

  const userId = profile?.user_id ?? session?.user_id;
  const username = profile?.username ?? session?.username ?? '';
  const avatarUrl = profile?.avatar_url;

  return (
    <button
      type="button"
      onClick={() => userId !== undefined && openProfileModal(userId)}
      aria-haspopup="dialog"
      aria-label={t('lobby.profile.open', { username })}
      className={cn(styles.menu, className)}
    >
      <span className={styles.avatarFrame}>
        <span className={styles.avatar}>
          {avatarUrl && !imageFailed ? (
            <img
              src={avatarUrl}
              alt=""
              onError={() => setImageFailed(true)}
              className={styles.avatarImage}
            />
          ) : (
            <Icon name="smile" className={styles.avatarPlaceholder} />
          )}
        </span>
        <span aria-hidden="true" className={styles.onlineDot} />
      </span>

      <span className={styles.details}>
        <span className={styles.nameRow}>
          <span className={styles.name}>{username}</span>
          <span className={styles.badge}>
            <span aria-hidden="true" className={styles.badgeDot} />
            {t('lobby.profile.online')}
          </span>
        </span>
        {status === 'READY' && profile ? (
          <span className={styles.level}>{t('lobby.profile.level', { level: profile.level })}</span>
        ) : (
          status === 'LOADING' && <span aria-hidden="true" className={styles.levelSkeleton} />
        )}
      </span>

      <span aria-hidden="true" className={styles.chevron}>
        <Icon name="chevronDown" />
      </span>
    </button>
  );
}
