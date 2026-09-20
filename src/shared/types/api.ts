/**
 * REST envelopes and the error taxonomy, from Bruno `rest-api/opencollection.yml`
 * (Response envelopes) and `04 - Error & State Examples/folder.yml`.
 *
 * Wire field names stay snake_case exactly as the contract defines them.
 */

/** Every non-empty REST success is `{ "data": value }`. `204` has no body. */
export interface ApiSuccess<T> {
  data: T;
}

/** Every REST error is `{ "error": { code, message, details } }`; `details` is always an object. */
export interface ApiErrorPayload {
  code: string;
  message: string;
  details: Record<string, unknown>;
}

export interface ApiErrorBody {
  error: ApiErrorPayload;
}

/** Codes listed in Bruno's cross-endpoint REST taxonomy. */
export type RestErrorCode =
  | 'INVALID_EMAIL'
  | 'INVALID_USERNAME'
  | 'INVALID_PASSWORD'
  | 'EMAIL_TAKEN'
  | 'USERNAME_TAKEN'
  | 'INVALID_CREDENTIALS'
  | 'SESSION_EXPIRED'
  | 'UNAUTHORIZED'
  | 'USER_NOT_FOUND'
  | 'ALREADY_FRIENDS'
  | 'NOT_FRIENDS'
  | 'ROOM_NOT_FOUND'
  | 'ROOM_NOT_JOINABLE'
  | 'ALREADY_IN_ROOM'
  | 'NOT_ROOM_MEMBER'
  | 'INVALID_IMAGE'
  | 'VALIDATION_ERROR'
  | 'RATE_LIMITED'
  | 'SERVICE_UNAVAILABLE';

/**
 * UI-handling bucket each error falls into. Bruno's codes stay the authoritative
 * list (`workspace.yml` · Error Philosophy); this is the UI classification applied
 * to them in `shared/api/errors`, not a second code list.
 */
export type ErrorHandlingClass =
  | 'INLINE_VALIDATION'
  | 'TOAST'
  | 'AUTH_REDIRECT'
  | 'ROOM_RECOVERY'
  | 'RECONNECT'
  | 'FATAL_GAME_STATE';

/** `GET /api/health` */
export interface HealthResponse {
  status: 'OK';
  contract_version: string;
  server_time: string;
}
