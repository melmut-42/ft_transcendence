# ft_transcendence Bruno workspace

This repository contains the Git-native [Bruno](https://www.usebruno.com/) workspace for the `ft_transcendence` API. It provides a reviewable, repeatable API-testing surface for backend developers, frontend developers, QA, and contributors.

The workspace documents the API contract currently known by the project. It does not add unsupported features such as chat, tournaments, friends, notifications, password authentication, or JWT authentication.

## 📚 What is included

The workspace contains two collections:

- **ft_transcendence REST API** — temporary username/session bootstrap and room lifecycle requests.
- **ft_transcendence WebSocket API** — the shared room socket, client action references, server event references, and error-envelope examples.

The Bruno workspace documentation in `workspace.yml` contains the full project overview, setup notes, workflows, testing guidance, and known limitations. The sections below provide a quick-start reference for contributors.

## ⚙️ Requirements

- [Bruno](https://www.usebruno.com/downloads) with support for native response examples and WebSocket requests.
- A running `ft_transcendence` backend available at `http://localhost:3000` when sending requests.

This repository contains the Bruno API workspace; it does not replace the application backend.

## 🚀 Getting started

1. Clone the repository and open this directory in Bruno.
2. If the workspace is maintained on the `bruno` branch, switch to it:

   ```bash
   git switch bruno
   ```

3. Start the backend according to the backend project's instructions.
4. Open the workspace directory in Bruno.
5. Select the workspace-level **local** environment.
6. Run the REST smoke flow described below.

The committed environment uses local URLs and blank session variables. Do not replace those blank values with real session IDs in a committed file.

## 🧩 Repository structure

```text
workspace.yml                  # Bruno workspace metadata and workspace documentation
environments/local.yml         # Safe local variables; secrets remain blank
collections/rest-api/          # REST collection and requests
collections/websocket/         # WebSocket collection and requests
```

All collection and environment files are plain text, so changes can be reviewed and maintained alongside backend changes.

## 🌍 Configure the local environment

Select the `local` environment in Bruno. It defines:

- `baseUrl`: `http://localhost:3000`
- `wsUrl`: `ws://localhost:3000`
- runtime session variables populated by the REST bootstrap
- `room_id` and optional prepared-state room IDs

The REST bootstrap requests generate unique usernames and chain temporary values such as `user_session_id`, `second_user_session_id`, and `room_id` at runtime. Session variables are marked secret and are intentionally empty in Git.

## 🌐 REST smoke flow

When the backend is running, execute these requests in order:

1. `REST API / User & Session / Enter user`
2. `REST API / User & Session / Enter second user`
3. `REST API / Rooms / Create room as host`
4. `REST API / Rooms / Get room state as host`
5. `REST API / Rooms / Join room as second user`
6. `REST API / Rooms / Get room state as second user`

The collection also includes native response examples for successful and error scenarios, including invalid input, missing sessions, duplicate usernames, duplicate membership, missing rooms, forbidden access, and non-joinable rooms.

Requests marked as manual or prepared-state scenarios require suitable data. For example, the outsider request needs a session that is not a room member, while the in-progress and finished-room requests need room IDs in those states.

## 📍 REST contract summary

The known REST routes are:

```text
POST /users/enter
POST /rooms
POST /rooms/join
GET  /rooms/:room_id
```

REST authentication uses temporary username-based sessions. Protected requests send the session in the `X-Session-Id` header. The workspace does not define password, JWT, registration, or login endpoints.

## ⚡ WebSocket usage

The application uses one shared socket:

```text
{{wsUrl}}/ws?session_id={{session_id}}
```

Open `WebSocket API / Connection / connect` after a valid REST session exists. The known client events are:

```text
leave_room
start_game
give_clue
reveal_card
end_turn
```

The known server events are:

```text
player_joined
player_left
game_started
clue_given
card_revealed
turn_changed
player_disconnected
player_reconnected
game_finished
game_action_logged
```

`give_clue` contains the only complete client payload schema currently known by the contract. Other action messages are disabled reference messages rather than guessed payloads. Server event requests document event names without inventing undocumented payload fields.

WebSocket messages are not separate HTTP routes. Use the connection request and select individual messages in Bruno's WebSocket UI. Do not batch-run the complete WebSocket collection: some messages are interactive or require a prepared game state.

## 🎮 Contract and game-state notes

- A room needs four players before the host can start a game.
- Only the host can start the game.
- The server validates identity, membership, role, turn, and game state.
- Clients must not submit `card_type`, `correct`, or a predicted reveal result.
- Operatives receive `card_type: null` before the game ends; spymasters may receive the card type.
- Rejected WebSocket actions must not mutate state or create a successful action log.

## 🧪 Testing

REST requests include native response examples, status checks, response-structure checks, and business-rule tests. Use the examples to review expected success and error envelopes without contacting the backend.

The WebSocket collection is primarily interactive. Run connection and event requests individually, with the required session, role, turn, and room state prepared first.

If Bruno's CLI is installed, the REST collection can be run from this directory:

```bash
bru run collections/rest-api --env local
```

The CLI is optional and is not bundled with this repository.

## 🚀 Automated documentation and GitHub Pages

Every push that changes the Bruno workspace on the `bruno` branch triggers [`.github/workflows/bruno-docs.yml`](.github/workflows/bruno-docs.yml). The workflow:

1. 🔍 Checks out `bruno`.
2. 📚 Discovers every `opencollection.yml` under `collections/`.
3. 📝 Parses collection, folder, request, response-example, WebSocket-message, script, and Markdown data.
4. 🎨 Generates a responsive static site in `dist/bruno-docs`.
5. 🌿 Publishes only the generated site to the `bruno-docs` branch.

The generator is intentionally based on the repository's actual OpenCollection YAML format. It does not assume that Bruno provides a static HTML export command. New collections are discovered automatically when their directory contains an `opencollection.yml` file.

### 🌐 One-time GitHub Pages setup

Repository administrators must configure GitHub Pages once:

1. Open **Settings → Pages**.
2. Under **Build and deployment**, choose **Deploy from a branch**.
3. Select branch **`bruno-docs`** and folder **`/(root)`**.
4. Save the setting and wait for the first Pages deployment.

The workflow needs repository Actions permission to write contents. In **Settings → Actions → General → Workflow permissions**, enable **Read and write permissions** if the repository default is read-only. The workflow itself requests only `contents: write`.

Generated HTML is never edited manually on `bruno-docs`; update the Bruno workspace on `bruno` and push again. If the generated output has not changed, the workflow skips the commit.

## 🛡️ Security

Never commit production credentials, API keys, database credentials, passwords, or real session IDs. Keep sensitive values in Bruno's local environment storage or process environment variables. Review `environments/local.yml` before committing changes and keep secret variables blank unless the value is a safe placeholder.

## 🤝 Contributing

When updating the workspace:

1. Keep routes, methods, event names, payloads, and validation rules aligned with the backend contract.
2. Use concise request names without numeric or descriptive prefixes.
3. Add or update native Bruno response examples for every known response scenario.
4. Keep unsupported or unknown payload fields disabled rather than guessing them.
5. Validate YAML files and run `git diff --check` before opening a pull request.
6. Do not commit generated secrets, real sessions, or local-only state.

For broader workspace guidance, open the Bruno workspace Overview panel and read the documentation stored in `workspace.yml`.

## 🔖 Workspace version

The REST and WebSocket collections are currently documented as version `1.1.0`. This version describes the Bruno workspace coverage and documentation structure; it is not a replacement for the backend application's release version.
