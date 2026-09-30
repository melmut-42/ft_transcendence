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

/**
 * Username rule shared by Register and `PATCH /api/users/me`: trimmed, 3–20 letters,
 * digits or underscores. Uniqueness is case-insensitive and only the server can check it.
 */
export const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,20}$/;

/** `PATCH /api/users/me` request body — `username` omitted means unchanged. */
export interface UpdateOwnProfileRequest {
  username?: string;
}

/** `POST /api/users/me/avatar` (multipart, field name `avatar`). */
export interface UploadAvatarResponse {
  avatar_url: string;
}

/** `GET /api/avatars/presets` entry — a ready-made avatar. */
export interface AvatarPreset {
  preset_id: string;
  avatar_url: string;
}

export interface AvatarPresetListResponse {
  presets: AvatarPreset[];
}

/** `PUT /api/users/me/avatar` body; the response is `UploadAvatarResponse`. */
export interface SelectAvatarPresetRequest {
  preset_id: string;
}

/** `GET /api/friends` entry, and the `POST /api/friends` response body. */
export interface Friend {
  user_id: number;
  username: string;
  avatar_url: string;
  is_online: boolean;
}

/** `GET /api/friends` — one page, ordered case-insensitively by `username`, then `user_id`. */
export interface FriendListResponse {
  friend_count: number;
  /** Applied page size, `1..100`. */
  limit: number;
  /** Applied offset. */
  offset: number;
  /** Whether another page follows this one. */
  has_more: boolean;
  friends: Friend[];
}

/**
 * `GET /api/friends` query parameters. A type alias, like `MatchHistoryQuery`, so it can
 * be passed straight to the REST client's `query` option.
 */
export type FriendListQuery = {
  /** `1..100`, default `50`. */
  limit?: number;
  /** `>= 0`, default `0`. */
  offset?: number;
};

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
