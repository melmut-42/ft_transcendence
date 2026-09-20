## Description
Build the profile modal.

## Tasks

* Own profile view (`GET /api/users/me`).
* Other-user profile view (`GET /api/users/{user_id}`).
* Avatar (`avatar_url` — every user has one; a user who never uploaded gets a deterministic default derived from `user_id`).
* Stats: `wins`, `losses`, `matches_played`, `level`.
* Friendship state, with add/remove entry points.
* Online status (`is_online`) on the public profile.

## Rules

* **Must use the app-level modal host** (`app/modal/ModalHost.tsx` + `shared/stores/modalStore.ts`). Any feature opens it with `openProfileModal(userId)`; no feature imports `features/profile` directly.
* The profile is a modal, not a route. The underlying Lobby/Room/Game screen stays mounted and must be visually dimmed and non-interactive while it is open.
* The chat widget stays visible and usable while the modal is open.
* The own-profile payload has no `is_online`; the public-profile payload has no `active_room_id` or `created_at`. Do not assume one shape for both.

## Contract Source

Bruno `rest-api/02 - Users & Profile/get-own-profile.yml` and `get-public-profile.yml`.

## Acceptance Criteria

* Opens from the Lobby, the Room and the Game without any feature-to-feature import.
* Focus is trapped inside the modal, Escape closes it, and focus returns to the trigger.
* The underlying screen is dimmed and cannot be interacted with.
* Loading, error and not-found (`404 USER_NOT_FOUND`) states are handled.

## Dependencies

Depends on the authentication flow.
