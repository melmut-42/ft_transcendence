import { useState } from 'react';

import { useLogOut } from '@app/session/useLogOut';
import { LogOutDialog } from '@features/auth/components/LogOutDialog';
import { SettingsModal } from '@features/profile/components/SettingsModal';
import { useRoomStore } from '@features/room/store/roomStore';
import { useSessionStore } from '@shared/stores';

/**
 * Settings with what it needs from other features, joined here at app level so no feature
 * imports another: Log Out from the session flow, and from the room store whether the user
 * is in a running match, where logging out forfeits and is confirmed first.
 */
export function SettingsPopup({ onClose }: { onClose: () => void }) {
  const { status, logOut } = useLogOut();
  const [confirming, setConfirming] = useState(false);
  const activeRoomId = useSessionStore((state) => state.activeRoomId);
  const inMatch = useRoomStore(
    (state) =>
      activeRoomId !== null &&
      state.room?.room_id === activeRoomId &&
      state.room.status === 'IN_GAME',
  );

  return (
    <>
      <SettingsModal
        onClose={onClose}
        active={!confirming}
        logOut={{
          status: confirming ? 'IDLE' : status,
          request: () => (inMatch ? setConfirming(true) : void logOut()),
        }}
      />
      {confirming && (
        <LogOutDialog
          pending={status === 'PENDING'}
          failed={status === 'FAILED'}
          onConfirm={() => void logOut()}
          onCancel={() => setConfirming(false)}
        />
      )}
    </>
  );
}
