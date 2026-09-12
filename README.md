# ft_transcendence Bruno API contract

This repository is the development, Git-native API contract for the username-only `ft_transcendence` Codenames-style game. Open the repository root as a Bruno workspace.

## Collections

- `collections/rest-api` — identity, profiles, room lifecycle, and authoritative snapshots.
- `collections/websocket` — realtime room setup, readiness/countdown, game actions, events, errors, and full role-safe state scenarios.
- `environments/local.yml` — safe localhost defaults and blank secret session values.
- `workspace.yml` — product rules, state machines, fixtures, privacy, and protocol boundaries.

## Local use

1. Start the development API at `http://localhost:3000`.
2. Select the `local` environment.
3. Register and create or join room `1001` through REST.
4. Connect to `{{wsUrl}}/ws/rooms/{{roomId}}` with `X-Session-Id`.
5. Use the named WebSocket message examples only when their documented preconditions hold.

The contract can lead implementation; a failing request can mean the backend has not yet implemented the specified behavior. Never commit a real session token.
