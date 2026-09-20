## Description
Implement the application route table and, more importantly, recovery of the correct screen after a page refresh.

## Tasks

* Public routes: `/`, `/login`, `/register`, `/privacy`, `/terms`.
* Authenticated routes: `/lobby`, `/room/:roomId`.
* `active_room_id` bootstrap: read it from `GET /api/auth/session` and send the user to the right place.
* Room-state-based recovery: once in a room, the screen is derived from authoritative `room.status` (`WAITING`, `COUNTDOWN`, `IN_GAME`, `FINISHED`), not from the previous URL or local navigation history.
* `ROOM_RECOVERY` error handling: `404 ROOM_NOT_FOUND`, `403 NOT_ROOM_MEMBER`, `409 ROOM_NOT_JOINABLE` and `409 ALREADY_IN_ROOM` return the user to the Lobby with an explanatory toast.

Profile stays a modal rendered by the app-level modal host. It is not a route and must not become one.

## Contract Source

Bruno `rest-api/01 - Identity/current-session.yml` and `rest-api/03 - Rooms/get-room-snapshot.yml`.

## Acceptance Criteria

* A refresh recovers the correct screen from authoritative server state, never from the URL alone.
* A refresh on `/room/:roomId` while the user is no longer a member returns to the Lobby with a toast, not to a broken room screen.
* A refresh while `active_room_id` is set but the user is sitting on `/lobby` sends them back into their room.
* A refresh while `active_room_id` is `null` but the URL points at a room returns to the Lobby.
* Visiting an authenticated route while anonymous redirects to Login and returns to the intended route after a successful login.
* `/privacy` and `/terms` are reachable without a session.

## Dependencies

Depends on the authentication flow.
