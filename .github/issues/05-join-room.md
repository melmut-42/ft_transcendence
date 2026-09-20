## Description
Implement the Join Room flow, from code entry to arriving in the room.

## Tasks

* `room_code` input with client-side validation against `^[A-Z0-9]{6}$` (accept lowercase input and normalize to uppercase — the lookup endpoint is case-insensitive on input).
* `GET /api/rooms/lookup/{room_code}` to resolve the code to a `room_id`.
* `POST /api/rooms/{room_id}/members` to join.
* Backend error handling: `404 ROOM_NOT_FOUND`, `409 ROOM_NOT_JOINABLE` (status is not `WAITING`), `409 ALREADY_IN_ROOM`, `422 VALIDATION_ERROR`.
* Navigate to `/room/:roomId` on success.

The lookup response carries `status` and `player_count`, so the UI can show a preview and disable Join when the room is not `WAITING`.

## Canonical Code Format

`^[A-Z0-9]{6}$` — six uppercase alphanumeric characters, no separator. Accept and display this format only, whatever a mockup shows.

## Contract Source

Bruno `rest-api/03 - Rooms/lookup-room-by-code.yml` and `join-room.yml`.

## Acceptance Criteria

* Invalid code formats are rejected inline before a request is made.
* A code for a room that is not `WAITING` produces a clear, non-generic message.
* A successful join navigates to the room route with the joined room's state applied.
* Every documented error code has a distinct, understandable message.

## Dependencies

Depends on the Lobby page.
