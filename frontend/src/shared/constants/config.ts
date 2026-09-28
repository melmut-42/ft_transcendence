/**
 * Central runtime configuration.
 *
 * The deployment model is single-origin: one reverse proxy serves the SPA and
 * forwards `/api` and `/ws` to the Gateway. That is what lets the browser attach the
 * HttpOnly `ft_session` cookie to
 * REST calls and to the WebSocket upgrade without any cross-origin configuration.
 *
 * Consequently: paths are relative, no production domain is hardcoded, and no secret
 * belongs in this file or in any `VITE_*` variable (they are inlined into the bundle).
 */

/** Same-origin REST prefix. Every REST call is issued against this path. */
export const API_BASE_PATH = import.meta.env.VITE_API_BASE_PATH ?? '/api';

/** Same-origin WebSocket prefix. */
export const WS_BASE_PATH = import.meta.env.VITE_WS_BASE_PATH ?? '/ws';

/** Per-room socket carrying both `room.*` and `game.*` events. */
export const wsRoomPath = (roomId: number): string => `${WS_BASE_PATH}/rooms/${roomId}`;

/** Per-user chat socket, independent of any room. */
export const WS_CHAT_PATH = `${WS_BASE_PATH}/chat`;

/** Absolute `ws(s)://` URL for a same-origin socket path. */
export function toWebSocketUrl(path: string): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}${path}`;
}

export const IS_DEV = import.meta.env.DEV;

/** Development-only switches. Keep these off by default in production builds. */
export const devFlags = {
  /** Log every inbound/outbound WebSocket frame. */
  logWebSocketTraffic: IS_DEV,
  /** Log normalized REST failures. */
  logApiErrors: IS_DEV,
} as const;

/**
 * Reconnect backoff bounds. The server-side grace period is 30s in
 * `WAITING`/`COUNTDOWN` and 60s `IN_GAME`, so retries must stay well inside that.
 */
export const RECONNECT = {
  initialDelayMs: 500,
  maxDelayMs: 5_000,
  /** `null` means keep retrying; the grace period decides the real deadline. */
  maxAttempts: null as number | null,
} as const;
