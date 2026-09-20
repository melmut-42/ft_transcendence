## Description
Implement the browser side of registration, login, session bootstrap, silent refresh and logout against the Bruno Identity contract.

The foundation already provides the REST client (`shared/api`), the session store (`shared/stores/sessionStore.ts`), the thin endpoint bindings (`features/auth/api/authApi.ts`) and the bootstrap gate (`app/bootstrap/SessionBootstrap.tsx`). This issue builds the flows, forms and error handling on top of them.

## Tasks

* Register form: `email`, `username`, `password`. Validation mirrors the contract (`username` matches `^[A-Za-z0-9_]{3,20}$`, `password` is 8–72 bytes).
* Login form: `email` + `password`.
* Session bootstrap: `GET /api/auth/session` on app start, before any route renders.
* Silent refresh: a `401 UNAUTHORIZED` triggers one `POST /api/auth/refresh` and one retry.
* Logout: `DELETE /api/auth/session`. Legal in every room status; forfeits an `IN_GAME` match server-side.
* Auth error states, mapped to the agreed handling classes: `INLINE_VALIDATION` for 422 field errors and the 409 uniqueness conflicts, `AUTH_REDIRECT` for `401 SESSION_EXPIRED` and for a `401 UNAUTHORIZED` that survives a failed refresh.
* Public and private route behavior wired through `RequireAuth` / `RequireAnonymous`.

## Contract Source

Bruno `rest-api/01 - Identity/` (`register.yml`, `login.yml`, `refresh-session.yml`, `current-session.yml`, `end-session.yml`).

## Acceptance Criteria

* Authentication in the browser is **cookie-only**. `ft_session` and `ft_refresh` are HttpOnly and never read by JS.
* No `X-Session-Id` header is sent anywhere, on REST or on either WebSocket.
* No token, session identifier or credential is written to `localStorage`, `sessionStorage`, IndexedDB or a non-HttpOnly cookie.
* No `Authorization: Bearer` header is attached to any request.
* Reloading the page while logged in restores the session without a re-login, including when `ft_session` has expired but `ft_refresh` is still valid.
* A failed refresh (`401 SESSION_EXPIRED`) sends the user to Login with a clear message.
* Register surfaces `EMAIL_TAKEN` and `USERNAME_TAKEN` inline on the right field.
* Login surfaces `INVALID_CREDENTIALS` without revealing whether the email exists.
* Logout clears client state and works while the user is in a room.

## Owner Area

Integration layer (`features/auth/api`, `features/auth/hooks`, `shared/stores`) plus the auth forms.
