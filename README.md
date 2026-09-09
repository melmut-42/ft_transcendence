# ft_transcendence Bruno API workspace

This repository contains the Git-native [Bruno](https://www.usebruno.com/) workspace for the `ft_transcendence` API. It is used to review, test, and document the supported REST and WebSocket contracts.

## Contents

- [REST API documentation](docs/rest-api.html)
- [WebSocket API documentation](docs/websocket.html)
- `collections/rest-api/` — user sessions and room lifecycle endpoints
- `collections/websocket/` — connection, client actions, server events, and error references
- `environments/local.yml` — safe local URLs and blank secret variables
- `workspace.yml` — Bruno workspace metadata and overview documentation

## Quick start

1. Install [Bruno](https://www.usebruno.com/downloads).
2. Clone this repository and open the workspace directory in Bruno.
3. Start the backend at `http://localhost:3000`.
4. Select the workspace-level `local` environment.
5. Run the REST flow: `Enter user` → `Create room as host` → `Get room state`.
6. For the prepared guest flow, set `guest_session_id`, then run `Join room`.
7. Open the WebSocket `connect` request after a valid session exists.

The workspace can also be run with the Bruno CLI, if installed:

```bash
bru run collections/rest-api --env local
```

## API summary

REST endpoints:

```text
POST /users/enter
POST /rooms
POST /rooms/join
GET  /rooms/:room_id
```

REST authentication uses temporary username-based sessions sent in the `X-Session-Id` header. WebSocket authentication uses the `session_id` query parameter:

```text
{{wsUrl}}/ws?session_id={{session_id}}
```

Known WebSocket client actions are `leave_room`, `start_game`, `give_clue`, `reveal_card`, and `end_turn`. The server event references are available in the WebSocket collection and generated documentation.

## Contract notes

- Every room requires exactly four players. When returned by the REST API, `minimum_players` is always `4` and is not configurable.
- Only the host can start the game.
- The server validates membership, role, turn, and game state.
- Only the payloads supported by the known contract are documented; unknown WebSocket payloads remain reference-only.
- This workspace does not add chat, tournaments, friends, notifications, passwords, JWT authentication, or other unsupported features.

## Security

Never commit real session IDs, credentials, API keys, passwords, tokens, cookies, or production URLs. Keep secret values in Bruno's local environment storage. The committed `local` environment intentionally contains blank session variables and safe localhost defaults.

## Updating the workspace

When the backend contract changes:

1. Update the Bruno request, documentation, and native response examples together.
2. Keep routes, methods, event names, payloads, and validation rules accurate.
3. Do not guess undocumented fields or behavior.
4. Validate YAML files and run `git diff --check` before committing.

The HTML files in `docs/` are generated collection documentation. Regenerate them in Bruno when the collections change, and review them before publishing.
