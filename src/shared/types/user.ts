/**
 * Profile, search and friend types, from Bruno `rest-api/02 - Users & Profile/`
 * and `05 - Friends/`.
 */

/** `GET /api/users/me`, `PATCH /api/users/me`. */
export interface OwnProfile {
  user_id: number;
  username: string;
  avatar_url: string;
  level: number;
  wins: number;
  losses: number;
  matches_played: number;
  active_room_id: number | null;
  created_at: string;
}

/** `GET /api/users/{user_id}`. */
export interface PublicProfile {
  user_id: number;
  username: string;
  avatar_url: string;
  level: number;
  wins: number;
  losses: number;
  matches_played: number;
  is_online: boolean;
}

/** `PATCH /api/users/me` request body — `username` omitted means unchanged. */
export interface UpdateOwnProfileRequest {
  username?: string;
}

/** `POST /api/users/me/avatar` (multipart, field name `avatar`). */
export interface UploadAvatarResponse {
  avatar_url: string;
}

/** `GET /api/friends` entry, and the `POST /api/friends` response body. */
export interface Friend {
  user_id: number;
  username: string;
  avatar_url: string;
  is_online: boolean;
}

export interface FriendListResponse {
  friend_count: number;
  friends: Friend[];
}

export interface AddFriendRequest {
  user_id: number;
}

/** `GET /api/users/search?q=` result entry. */
export interface UserSearchResult {
  user_id: number;
  username: string;
  avatar_url: string;
  is_friend: boolean;
}

export interface UserSearchResponse {
  results: UserSearchResult[];
}
