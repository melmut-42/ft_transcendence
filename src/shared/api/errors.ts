/**
 * Normalized REST failure shape and its UI-handling classification.
 *
 * Bruno's codes stay the authoritative list (`04 - Error & State Examples`); the
 * handling class is the UI bucket each code falls into, defined once here so no
 * component re-invents "what do I do with a 409 here".
 */

import type { ApiErrorPayload, ErrorHandlingClass } from '@shared/types';

/** Every REST failure surfaces as this one error type, transport faults included. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: Record<string, unknown>;

  constructor(status: number, code: string, message: string, details: Record<string, unknown>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  /** Field name carried by a `422` validation failure, when the server names one. */
  get field(): string | undefined {
    const field = this.details.field;
    return typeof field === 'string' ? field : undefined;
  }
}

/** Synthetic code for a request that never produced an HTTP response. */
export const NETWORK_ERROR_CODE = 'NETWORK_ERROR';

/** Synthetic code for a response body that was not the documented error envelope. */
export const MALFORMED_RESPONSE_CODE = 'MALFORMED_RESPONSE';

function isApiErrorPayload(value: unknown): value is ApiErrorPayload {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.code === 'string' && typeof candidate.message === 'string';
}

/** Build an `ApiError` from a failed response, falling back when the body is not the envelope. */
export async function normalizeErrorResponse(response: Response): Promise<ApiError> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = undefined;
  }

  const payload = (body as { error?: unknown } | undefined)?.error;
  if (isApiErrorPayload(payload)) {
    const details =
      typeof payload.details === 'object' && payload.details !== null ? payload.details : {};
    return new ApiError(response.status, payload.code, payload.message, details);
  }

  return new ApiError(
    response.status,
    MALFORMED_RESPONSE_CODE,
    `Request failed with status ${response.status}.`,
    {},
  );
}

/**
 * Map an error onto the handling class the UI should apply.
 *
 * `AUTH_REDIRECT` covers `401` only after a silent refresh has already failed —
 * the client decides that before calling this, since a first `401 UNAUTHORIZED` is
 * a retry-after-refresh signal, not a logout.
 */
export function classifyApiError(error: ApiError): ErrorHandlingClass {
  switch (error.code) {
    case 'INVALID_EMAIL':
    case 'INVALID_USERNAME':
    case 'INVALID_PASSWORD':
    case 'INVALID_IMAGE':
    case 'INVALID_AVATAR_PRESET':
    case 'EMAIL_TAKEN':
    case 'USERNAME_TAKEN':
    case 'INVALID_CREDENTIALS':
      return 'INLINE_VALIDATION';
    case 'UNAUTHORIZED':
    case 'SESSION_EXPIRED':
      return 'AUTH_REDIRECT';
    case 'ROOM_NOT_FOUND':
    case 'NOT_ROOM_MEMBER':
    case 'ROOM_NOT_JOINABLE':
    case 'ROOM_FULL':
    case 'ALREADY_IN_ROOM':
      return 'ROOM_RECOVERY';
    case 'VALIDATION_ERROR':
      return error.status === 422 ? 'INLINE_VALIDATION' : 'TOAST';
    default:
      return 'TOAST';
  }
}
