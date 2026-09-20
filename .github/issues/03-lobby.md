## Description
Build the Lobby screen: the authenticated home from which everything else starts.

## Tasks

* Current user summary (username, avatar, level/stats entry point).
* Create room entry point.
* Join room entry point (room-code input).
* Profile entry point, opening the app-level profile modal.
* Integration points for the friends list and the chat widget.

## Out of scope

The UI mockups on the `ui-design` branch are a visual reference. They show concepts the contract does not define, so do not implement them:

* no room list or room browser — there is no browse endpoint, and Join Room is code entry only;
* no room-name field — rooms have no `name`;
* no fixed "4/8" capacity display — there is no capacity limit in the contract;
* no Classic/Blitz mode selector and no game timer;
* no guest entry — users authenticate before entering the Lobby.

## Contract Source

Bruno `rest-api/02 - Users & Profile/get-own-profile.yml`, `05 - Friends/list-friends.yml`.

## Acceptance Criteria

* Shows the authenticated user's own profile summary from `GET /api/users/me`.
* Create and Join entry points are present and keyboard reachable.
* Clicking a user anywhere on the screen opens the profile modal without a route change.
* The chat widget is mounted on this screen.
* Loading, empty and error states are handled for every data read.

## Dependencies

Depends on the authentication flow and application routing.
