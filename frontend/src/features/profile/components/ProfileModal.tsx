import { Modal } from '@shared/ui';

/**
 * Profile modal shell.
 *
 * Rendered by the app-level `ModalHost`, never by a feature. It covers both the own
 * profile and another user's public profile, and shows stats, avatar, friendship state
 * and online status.
 */
export function ProfileModal({ userId, onClose }: { userId: number; onClose: () => void }) {
  return (
    <Modal title="Player profile" onClose={onClose}>
      {/* TODO(profile): profile content for user {userId} — stats, avatar, friendship. */}
      <p>Profile #{userId}</p>
    </Modal>
  );
}
