## Description
Build the friends experience.

## Tasks

* Friends list (`GET /api/friends`), with `friend_count`.
* Username search for discovery (`GET /api/users/search?q=`), 1–20 characters, results carry `is_friend`.
* Add a friend (`POST /api/friends`).
* Remove a friend (`DELETE /api/friends/{user_id}`).
* Friendship state reflected in search results and on the profile modal.
* Online status (`is_online`) in the list.
* Opening a user's profile from the list and from search results.

## Rules

* Friendship is immediate and mutual. There is **no** request/accept workflow, no pending state and no incoming-requests inbox.
* `is_online` is backend presence (the user holds at least one open authenticated socket). Never infer it from this client's own connection.
* Error handling: `404 USER_NOT_FOUND`, `409 ALREADY_FRIENDS`, `404 NOT_FRIENDS`, and `422 VALIDATION_ERROR` when the target equals the requester.

## Contract Source

Bruno `rest-api/05 - Friends/`.

## Acceptance Criteria

* No friend-request or pending-approval UI exists.
* Search is debounced and handles empty and no-result states.
* Add and remove update the list optimistically or refetch, without a stale `friend_count`.
* Adding a user already a friend is handled without an error toast storm.
* Clicking a result opens the profile modal.

## Dependencies

Depends on the authentication flow and the profile modal.
