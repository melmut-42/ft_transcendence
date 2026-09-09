# ft_transcendence Bruno workspace

This is the Git-native Bruno workspace for the `ft_transcendence` API.

It contains two deliberately separate collections:

- `ft_transcendence REST API` — the username/session bootstrap and room HTTP API.
- `ft_transcendence WebSocket API` — the shared room socket, client action references, server event references, and error envelope.

The workspace documents the API contract that is currently known. It does not add chat, tournaments, authentication/password, JWT, or other modules that are not part of the application contract.

## Open the workspace

After cloning, switch to the `bruno` branch, then open the repository directory in Bruno:

```bash
git switch bruno
```

Open this directory in Bruno:

```text
/Users/yigit/Documents/bruno/ft_transcendence
```

Select the `local` environment. The committed environment contains safe local defaults and blank session variables. Session IDs are temporary values returned by `POST /users/enter`; the REST bootstrap requests chain them automatically at runtime.

## Repository structure

```text
workspace.yml
environments/local.yml
collections/rest-api/
collections/websocket/
```

All collection and environment files are plain text so changes are reviewable in Git and easy to maintain alongside backend changes.

## REST smoke flow

Run these requests in order when the API is available at `http://localhost:3000`:

1. `REST API / 01 User & Session / 01 Enter host user`
2. `REST API / 01 User & Session / 02 Enter guest user`
3. `REST API / 02 Rooms / 01 Create room as host`
4. `REST API / 02 Rooms / 02 Get room state as host`
5. `REST API / 02 Rooms / 03 Join room as guest`
6. `REST API / 02 Rooms / 04 Get room state as guest`

The first two requests generate unique usernames and save `session_id`, `host_session_id`, `guest_session_id`, `host_user_id`, and `guest_user_id` in runtime variables. The room creation request saves `room_id` for subsequent requests.

Error scenarios are included beside the happy path. Requests tagged `manual` require a deliberately prepared state (for example, an outsider session or an in-progress room) and are not part of the default smoke flow.

## Secrets and local state

Do not commit production credentials, API keys, database credentials, or real user secrets. Temporary session IDs are marked secret and are blank in the committed environment. Use Bruno's local environment storage or process environment variables for anything sensitive.

## WebSocket usage

The application uses one shared socket:

```text
{{wsUrl}}/ws?session_id={{session_id}}
```

Open `WebSocket API / 01 Connection / 01 Connect with session` after a REST session exists. Client action folders contain native WebSocket request files. `give_clue` includes the only saved client payload schema currently known. The other action payloads are intentionally disabled reference messages because their field-level schemas were not provided by the API contract. Server event folders describe event names and the visibility/state rules without inventing server payload fields.

WebSocket messages are not separate HTTP routes. Use the connection request and send/observe messages on that shared connection. Bruno's WebSocket UI supports selecting a message before sending it.

## Contract notes

- REST authentication is temporary username-based sessions; there is no password, JWT, registration, or login endpoint in this workspace.
- REST protection uses `X-Session-Id`. WebSocket authentication uses the `session_id` query parameter.
- A room needs four players before the host can start a game.
- Server validation owns membership, role, turn, state, and card-result decisions. Clients must not send `card_type`, `correct`, or another predicted reveal result.
- Operatives receive `card_type: null` before the game ends; spymasters receive the card type.
- Rejected WebSocket actions must not mutate state or create a successful action log.

## CLI / CI

The Bruno CLI is optional and is not bundled in this repository. With Bruno's CLI installed, run the REST collection against the selected environment from the workspace directory:

```bash
bru run collections/rest-api --env local
```

Do not run the complete WebSocket collection as a batch smoke test: WebSocket requests are interactive and some message references intentionally require a prepared game state.

## Testing and workflows

REST requests include meaningful status, schema, and business-rule tests. The bootstrap requests generate unique users and chain temporary IDs into the room workflow. The WebSocket collection is organized as interactive connection, action, server-event, and error observers; passive observers send no outgoing message, and unverified action payloads are disabled.
