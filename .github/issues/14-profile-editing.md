## Description
Implement profile editing and avatar upload.

## Tasks

* Editable profile fields. The contract currently allows exactly one: `username`, via `PATCH /api/users/me`. Omitting it leaves it unchanged.
* Avatar upload via `POST /api/users/me/avatar` (multipart, field name `avatar`).
* Validation: `username` matches `^[A-Za-z0-9_]{3,20}$` and is case-insensitively unique; the image is `image/jpeg`, `image/png` or `image/webp` and at most 2 MiB.
* Default avatar handling: a user with no upload gets a deterministic default from the server. There is no client-side default to invent.
* Upload error states: `422 INVALID_IMAGE`, `409 USERNAME_TAKEN`, `422 INVALID_USERNAME`.

## Rules

* Use the Bruno profile contracts exactly. Do not add editable fields the contract does not define (no bio, no display name, no email change).
* Do not set `Content-Type` by hand on the multipart request — let the browser set the boundary.
* Client-side size and type checks are a convenience; the server validates independently and its answer wins.
* Replacing an avatar deletes the previous file server-side, so the UI should refresh `avatar_url` everywhere it is displayed.

## Contract Source

Bruno `rest-api/02 - Users & Profile/update-own-profile.yml` and `upload-avatar.yml`.

## Acceptance Criteria

* Only `username` is editable.
* A successful update refreshes the username everywhere it is shown.
* A successful upload refreshes the avatar everywhere it is shown.
* Oversized and wrong-type files are rejected with a clear message, both before upload and when the server rejects them.
* `USERNAME_TAKEN` appears inline on the username field.

## Dependencies

Depends on the profile modal.
