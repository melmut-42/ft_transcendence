## Description
Implement the Create Room flow against the current Bruno room contract.

## Tasks

* `POST /api/rooms` — the request takes **no body**. There is no room-name field in the current contract, so the UI must not ask for one.
* Handle the response: `room_id`, `room_code`, `status`, `host_user_id`, `player_count`, `startable`, `players`, `game` (null), `created_at`.
* Update room state from the response.
* Navigate to `/room/:roomId`.
* Surface `room_code` so the creator can share it. It is the `^[A-Z0-9]{6}$` code, never `room_id`.
* Error handling: `409 ALREADY_IN_ROOM` (the user already has an active room) is a `ROOM_RECOVERY` case — offer to return to the existing room rather than silently failing.

## Contract Source

Bruno `rest-api/03 - Rooms/create-room.yml`.

## Acceptance Criteria

* No room-name input exists anywhere in the flow.
* A successful creation stores the returned room state and navigates to the room route.
* The creator is shown as host, with `team`, `role` null and `ready` false.
* `room_code` is displayed in the shareable six-character format and is easy to copy.
* `409 ALREADY_IN_ROOM` is handled gracefully.

## Dependencies

Depends on the Lobby page.
