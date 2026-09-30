import { useChatStore } from '@features/chat/store/chatStore';
import { useGameStore } from '@features/game/store/gameStore';
import { useInviteStore } from '@features/lobby/store/inviteStore';
import { useOwnProfileStore } from '@features/profile/store/ownProfileStore';
import { useSentInvitesStore } from '@features/profile/store/sentInvitesStore';
import { forgetRoomCode } from '@features/room/model/roomCode';
import { useRoomStore } from '@features/room/store/roomStore';
import { useConnectionStore, useModalStore, useSessionStore } from '@shared/stores';

/**
 * Lets go of the signed-in user once the server has ended the session, by Log Out or by
 * deleting the account: every store holding the user's private data is cleared, any open
 * modal closes, and the session becomes anonymous as a deliberate exit, so the route guard
 * takes the user to Landing. Leaving the private routes unmounts the room and chat sockets,
 * and the room route lets the user go without its leave prompt, since the server already
 * ended the membership.
 *
 * It lives at app level because it clears the stores of several features.
 */
export function endSignedInState({ accountDeleted = false }: { accountDeleted?: boolean } = {}) {
  const session = useSessionStore.getState();
  if (session.activeRoomId !== null) forgetRoomCode(session.activeRoomId);
  useModalStore.getState().close();
  useRoomStore.getState().clear();
  useGameStore.getState().clear();
  useChatStore.getState().clear();
  useInviteStore.getState().clear();
  useSentInvitesStore.getState().clear();
  useOwnProfileStore.getState().clear();
  useConnectionStore.getState().setRoomLost(false);
  session.setAnonymous({ loggedOut: true, accountDeleted });
}
