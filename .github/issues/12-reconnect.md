## Description
Implement the reconnect and disconnection experience.

## Tasks

* Connection overlay and connection state feedback.
* Reconnect with backoff.
* Grace-period UX: the server reserves the seat for 30s in `WAITING`/`COUNTDOWN` and 60s `IN_GAME`.
* Snapshot restoration on reconnect.
* Event-gap recovery.
* Handling a forfeit result that arrives because someone else's grace period expired.

## Rules

* **Do not perform event replay.** Recovery is always a fresh `room.state` snapshot; prior local state is discarded, not reconciled.
* A drop does not remove the user from the room and must not bounce them to the Lobby. Only an expired grace period does that, and mid-game it ends the match by forfeit instead.
* Close code `4401` means the session was explicitly revoked (logout, or refresh-token-family revocation). That is an authentication problem, not a transport one: refresh over REST or send the user to Login. Do not retry blindly.
* Ordinary access-token expiry does not close an open socket. If a refresh is needed, it happens over REST first, then the socket reconnects.

## Contract Source

Bruno `workspace.yml` (Reconnect Grace Period and Abandonment) and `websocket/opencollection.yml` (Reconnect).

## Acceptance Criteria

* A transient drop shows the overlay and recovers without losing team, role, ready state or turn rights.
* Reconnect applies a fresh snapshot and discards stale local state.
* A `4401` close does not enter an infinite retry loop.
* Another player's forfeit surfaces as a normal results screen, not as an indefinite overlay.
* No missed events are replayed at any point.

## Dependencies

Depends on the room WebSocket integration.
