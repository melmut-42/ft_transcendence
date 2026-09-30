import { useCallback } from 'react';

import { useFriendship } from '@features/friends/hooks/useFriendship';
import { ProfileModal } from '@features/profile/components/ProfileModal';
import type { InviteUnavailableReason } from '@features/profile/hooks/useInviteToRoom';
import { useRoomStore } from '@features/room/store/roomStore';
import { GameHistory } from '@features/stats/components/GameHistory';
import { useSessionStore } from '@shared/stores';

/**
 * The Profile pop-up with everything it needs from other features, joined here at app
 * level so no feature imports another: the friendship from `friends`, the room the user
 * is in from the room store, and GAME HISTORY from `stats`.
 *
 * The room is the live snapshot of the user's active room, so invite eligibility follows
 * every `room.state`, including the fresh one after a reconnect. Outside a room it is
 * `null` and Invite says so.
 */
export function ProfilePopup({ userId, onClose }: { userId: number; onClose: () => void }) {
  const me = useSessionStore((state) => state.user);
  const isSelf = me?.user_id === userId;

  return isSelf ? (
    <ProfileModal userId={userId} isSelf onClose={onClose} room={null} history={<GameHistory />} />
  ) : (
    <OtherProfile userId={userId} onClose={onClose} />
  );
}

function OtherProfile({ userId, onClose }: { userId: number; onClose: () => void }) {
  const friendship = useFriendship(userId);
  const activeRoomId = useSessionStore((state) => state.activeRoomId);
  const room = useRoomStore((state) =>
    state.room && state.room.room_id === activeRoomId ? state.room : null,
  );
  const { retry: rereadFriends } = friendship;

  // The server found the friend list out of date; read it again so the actions agree.
  const onInviteRefused = useCallback(
    (reason: InviteUnavailableReason) => {
      if (reason === 'NOT_FRIENDS') rereadFriends();
    },
    [rereadFriends],
  );

  return (
    <ProfileModal
      userId={userId}
      isSelf={false}
      onClose={onClose}
      friendship={friendship}
      room={room}
      onInviteRefused={onInviteRefused}
    />
  );
}
