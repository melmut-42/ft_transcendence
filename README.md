# ft_transcendence — Frontend

React SPA for Codenames Online. This repository currently holds the **foundation only**:
the structure, clients, stores, types and tokens that features are built on top of.
Feature behavior is tracked in GitHub Issues.

## Stack

| Area | Choice |
| --- | --- |
| Framework | React |
| Structure | Feature-based |
| State | Zustand (domain stores, never one global store) |
| Routing | React Router |
| Auth | Cookie-only session (`ft_session` / `ft_refresh`) |
| Styling | CSS custom properties + component-scoped CSS |
| REST | Browser `fetch`, no HTTP client dependency |

The runtime dependencies are React, React Router and Zustand. The frontend uses no HTTP
client library, no additional state library, no CSS framework and no component library.
Adding one is a team-level choice, not an implementation detail.

## Layout

```text
src/
├── app/         router, providers, bootstrap, app-level mounts, connection owners
├── layouts/     PublicLayout, LobbyLayout, GameLayout, Footer
├── features/    auth, lobby, room, game, profile, friends, chat, stats
├── shared/      api, websocket, stores, types, ui, constants, utils, styles, hooks
└── assets/      icons, fonts, images
```

Two folder names are worth calling out: `shared/constants` holds configuration (API and
WebSocket paths, environment, dev flags), and `shared/utils` holds generic helpers.

### Dependency direction

```text
app  ->  layouts  ->  features  ->  shared
```

- `shared/` never imports `app/`, `layouts/` or `features/`.
- A feature never imports another feature. Cross-feature needs go through `shared/` or
  an app-level mount point (the modal host, the chat mount).
- UI components never call REST or WebSocket directly — always through a feature hook.

The first two rules are enforced by ESLint (`no-restricted-imports`); the third is a
review rule.

## Contract sources

- REST and WebSocket contracts: the `bruno` branch (`bruno/collections/`).
- Visual reference: the `ui-design` branch. Mockups are a visual reference for layout,
  color and typography. They are not a behavioral contract; where a mockup and the Bruno
  contract disagree, the contract wins.

Types in `shared/types` mirror Bruno field names exactly, snake_case included. Do not
invent fields; if the frontend needs something the contract lacks, get the contract
updated first.

## Non-negotiables

- Authentication is cookie-only. Never read, store or attach a session token; the
  session cookie is the only credential, on REST and on both sockets.
- The backend is authoritative for every game rule. The frontend never computes a
  winner — only `game.ended` or a `FINISHED` snapshot is terminal.
- Room and Game share one WebSocket, owned by `app/connection/RoomConnectionProvider`.
  Neither feature opens its own socket.
- Reconnect recovery is a fresh `room.state` snapshot, never an event replay.
- Zero console errors or warnings in the supported evaluation flow.

## Mock sockets

`src/shared/websocket/mock` is an in-memory stand-in for the room and chat sockets. It
plugs in at the transport seam (`shared/websocket/transport.ts`), speaks the same Bruno
envelopes and event types, and enforces the same room rules, so stores and components
run unchanged against it.

Enable it for `npm run dev` with `VITE_MOCK_SOCKETS=true` in `.env`. It loads only
through a dynamic import guarded by `import.meta.env.DEV`, so production builds never
contain it. Once a room page connects, drive other players from the browser console:

```js
mockSockets.room().playerJoin({ user_id: 7, username: 'red_agent' });
mockSockets.room().selectTeam(7, 'BLUE');
mockSockets.room().updateSettings(6);             // host capacity change
mockSockets.room().configureStartable('SPYMASTER'); // fill both teams, start countdown
mockSockets.room().submitClue('ocean', 2);
mockSockets.room().guessCard(5);
mockSockets.room().playerLeave(7);                // IN_GAME: PLAYER_FORFEIT
mockSockets.room().dropConnection();              // reconnect + fresh room.state
mockSockets.chat.inviteReceived({ user_id: 7, username: 'red_agent' }, 1002, 'QWER12');
```

Each method throws a `MockActionError` carrying the contract error code when the action
breaks a rule (`ROOM_FULL`, `ROLE_CONFLICT`, `NOT_YOUR_TURN`, …). REST calls are not
mocked.

## Commands

```bash
npm install
npm run dev          # Vite dev server, proxying /api and /ws to the Gateway
npm run typecheck
npm run lint
npm run format
npm run build
```

`npm run dev` expects the Gateway at `VITE_DEV_PROXY_TARGET` (default
`http://localhost:3000`). Copy `.env.example` to `.env` to change it. The proxy exists
so local development mirrors the single-origin production model, which is what makes
the session cookie attach automatically to REST calls and WebSocket upgrades.
