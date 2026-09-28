import { useModalStore } from '@shared/stores';
import { ProfileModal } from '@features/profile/components/ProfileModal';

/**
 * App-level modal host.
 *
 * Mounted once, outside every feature. Any feature opens a modal by publishing an
 * intent to the modal store (`openProfileModal(userId)`), so Lobby, Room and Game can
 * open a profile without importing `features/profile`.
 */
export function ModalHost() {
  const active = useModalStore((state) => state.active);
  const close = useModalStore((state) => state.close);

  if (!active) return null;

  switch (active.kind) {
    case 'profile':
      return <ProfileModal userId={active.userId} onClose={close} />;
    default:
      return null;
  }
}
