/**
 * Room invitation binding — Bruno `rest-api/03 - Rooms/invite-friend.yml`.
 */

import { apiRequest } from '@shared/api';
import type { InviteFriendResponse } from '@shared/types';

export const inviteFriend = (roomId: number, userId: number): Promise<InviteFriendResponse> =>
  apiRequest(`/rooms/${roomId}/invites`, { method: 'POST', body: { user_id: userId } });
