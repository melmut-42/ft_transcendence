# UI Design

Design system and screen reference for ft_transcendence, authored in [pen.dev](https://pen.dev).

## Contents

- `ui.pen` — the design file: reusable components, design tokens (color, radius, stroke, typography), and every screen/state in the product flow.
- `avatars/` — SVG avatar assets used across profile and lobby components.

## Screens

`ui.pen` covers the full product flow:

- **Entry**: Landing, Login, Sign Up
- **Legal**: Privacy Policy, Terms of Service
- **Lobby**: Main Menu / Game Entry, Room Discovery, Create Room, Join Room, Multiplayer Lobby
- **Room lifecycle**: Countdown, Spymaster Waiting, Spymaster Gameplay, Operative Waiting, Operative Gameplay, Results
- **Overlays**: Reconnecting, Disconnected
- **Profile & chat**: Profile modal, Chat Conversations, Chat DM

Screens are laid out on a single canvas in product-flow order, grouped by row (entry/legal, lobby, in-room states, overlays/profile/chat).

## Editing

Open `ui.pen` in the pen.dev editor. Do not edit the encrypted file directly with a text editor — it is meant to be read and modified only through pen.dev tooling.
