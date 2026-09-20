/**
 * Auth REST bindings — Bruno `rest-api/01 - Identity/`.
 *
 * These are contract bindings, nothing more: no flow, no redirect, no state write.
 * The authentication flow (form handling, session store writes, guard behavior) is
 * feature work that builds on top of them.
 *
 * All five calls authenticate by cookie. Register/Login/Refresh set `ft_session` and
 * `ft_refresh`; nothing here reads, stores or forwards a token, because no token value
 * is ever present in a response body.
 */

import { apiRequest } from '@shared/api';
import type {
  LoginRequest,
  LoginResponse,
  RefreshResponse,
  RegisterRequest,
  RegisterResponse,
  SessionResponse,
} from '@shared/types';

export const registerAccount = (body: RegisterRequest): Promise<RegisterResponse> =>
  apiRequest('/auth/register', { method: 'POST', body, skipRefresh: true });

export const login = (body: LoginRequest): Promise<LoginResponse> =>
  apiRequest('/auth/login', { method: 'POST', body, skipRefresh: true });

/** Rotates `ft_refresh` and reissues both cookies. Never retried through the refresh hook. */
export const refreshSession = (): Promise<RefreshResponse> =>
  apiRequest('/auth/refresh', { method: 'POST', skipRefresh: true });

/**
 * The route-recovery bootstrap read: `active_room_id` here is authoritative, not the URL.
 *
 * Refresh is deliberately left enabled — a reload with an expired `ft_session` but a
 * live `ft_refresh` must recover the session rather than drop the user to Login.
 */
export const fetchSession = (): Promise<SessionResponse> => apiRequest('/auth/session');

/** Revokes both credentials. Legal in every room status; forfeits an `IN_GAME` match. */
export const endSession = (): Promise<void> => apiRequest('/auth/session', { method: 'DELETE' });
