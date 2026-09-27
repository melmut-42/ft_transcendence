# ft_transcendence Bruno API contract

This repository is the development, Git-native API contract for the `ft_transcendence` Codenames-style game. Accounts are email + username + password. Open the repository root as a Bruno workspace.

## Collections

- `collections/v1/rest-api` / `collections/v1/websocket` — stable v1 contracts.
- `collections/v2/game-rest-api` / `collections/v2/game-websocket` — v2 room and game lifecycle.
- `collections/v2/chat-rest-api` / `collections/v2/chat-websocket` — durable Chat v2 channels and live gateway.
- `environments/local.yml` — safe localhost defaults and blank secret session values.
- `workspace.yml` — product rules, state machines, fixtures, privacy, and protocol boundaries.

API v1 room/game/chat behavior remains available; its session and own-profile responses only gain the additive `active_room_api_version` recovery field. Game v2 and Chat v2 are separate Bruno collections and use `gameApiVersion: v2` and `chatApiVersion: v2`; frontend code must not mix room protocol versions within one session.

On application bootstrap, `GET /api/v1/auth/session` returns both `active_room_id` and `active_room_api_version`; use them together to restore the matching REST/WebSocket pair after refresh or reconnect.

## Local use

1. Start the development API at `http://localhost:3000`.
2. Select the `local` environment.
3. Register through REST API v1; identity and refresh endpoints remain v1 for every collection.
4. For the stable flow, create or join through REST v1 and connect to `{{wsUrl}}/ws/{{apiVersion}}/rooms/{{roomId}}`.
5. For the new flow, create or join through Game REST v2, connect gameplay to `{{wsUrl}}/ws/{{gameApiVersion}}/rooms/{{roomId}}`, and connect chat to `{{chatWsUrl}}/ws/{{chatApiVersion}}/channels`.
6. Authentication is cookie-only: `ft_session` attaches automatically on same-origin upgrades from Bruno's cookie jar. Use message examples only when their documented preconditions hold.

The contract can lead implementation; a failing request can mean the backend has not yet implemented the specified behavior. Bruno authenticates through its cookie jar exactly like a browser — `ft_session`/`ft_refresh` are set automatically by Register/Login/Refresh, never held in a variable or committed.
