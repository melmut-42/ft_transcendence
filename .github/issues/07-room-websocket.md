## Description
Wire the room WebSocket into the room and game domain stores.

The transport already exists: `shared/websocket/roomConnection.ts` owns the socket, correlates `request_id`s and tracks `event_id` ordering, and `app/connection/RoomConnectionProvider.tsx` owns a single instance per room. This issue connects it to state.

## Tasks

* Connect on entering a room route; disconnect on leaving.
* Apply the initial `room.state` snapshot (it embeds `game` when `room.status` is `IN_GAME` or `FINISHED`).
* Apply room events: `room.player.joined`, `room.player.left`, `room.player.updated`, `room.countdown.*`.
* `request_id` handling: generate one per command, correlate the `ack`, use it for UI feedback only.
* `event_id` ordering: detect a gap and recover.
* Reconnect handling and gap recovery.
* Publish connection status for the overlay.

## Rules

* **Use the shared Room/Game connection owner.** Do not open a second socket for the game. One socket carries both `room.*` and `game.*` events.
* An `ack` is confirmation, not a second write. Apply state from server events and snapshots only — applying both would double-apply the change.
* Recovery from a gap or a reconnect is a fresh `room.state` snapshot. **Never replay missed events.**
* Authentication is the `ft_session` cookie, attached automatically on a same-origin upgrade. Never attach it manually, never put it in a query string, never set a handshake header.

## Contract Source

Bruno `websocket/opencollection.yml` (Envelopes and ordering, Reconnect), `00 - Connection & Protocol/connect.yml`, `05 - Server Events/server-event-catalog.yml`.

## Acceptance Criteria

* Exactly one room socket is open per room, shared by Room and Game.
* The initial snapshot fully populates room state, and game state when present.
* A retried command with the same `request_id` does not double-apply.
* A detected `event_id` gap triggers a snapshot refresh, not a replay.
* Connection status is visible to the user while reconnecting.
* No credential appears in the WebSocket URL or in any client-set header.

## Dependencies

Depends on the Room Waiting experience.
