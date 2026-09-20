/**
 * Friends REST bindings — Bruno `rest-api/05 - Friends/`.
 *
 * Friendship is immediate and mutual; there is no request/accept workflow.
 */

import { apiRequest } from '@shared/api';
import type {
  AddFriendRequest,
  Friend,
  FriendListResponse,
  UserSearchResponse,
} from '@shared/types';

export const listFriends = (): Promise<FriendListResponse> => apiRequest('/friends');

export const addFriend = (body: AddFriendRequest): Promise<Friend> =>
  apiRequest('/friends', { method: 'POST', body });

export const removeFriend = (userId: number): Promise<void> =>
  apiRequest(`/friends/${userId}`, { method: 'DELETE' });

/** Username substring search for friend discovery, 1..20 characters. */
export const searchUsers = (query: string): Promise<UserSearchResponse> =>
  apiRequest('/users/search', { query: { q: query } });
