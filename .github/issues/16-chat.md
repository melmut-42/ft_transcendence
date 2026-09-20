## Description
Build the basic chat experience.

## Tasks

* The shared chat mount, already provided at `app/chat/ChatMount.tsx`: the widget is persistent on Lobby, Room and Game, and not on public routes.
* The chat WebSocket (`/ws/chat`), owned by `app/connection/ChatConnectionProvider.tsx`.
* Friend messaging.
* Same-room messaging while the shared room is `WAITING`, `COUNTDOWN` or `IN_GAME`.
* Delivery status from the send ack: `DELIVERED` or `RECIPIENT_OFFLINE`.
* Recipient-offline presentation.
* Error handling: `NOT_PERMITTED`, `USER_NOT_FOUND`, `INVALID_PAYLOAD`.

## Rules

* **No persistent chat history** unless the contract changes. Messages are live-delivery only: nothing is stored server-side, nothing is redelivered, and nothing should be written to browser storage to fake persistence.
* `RECIPIENT_OFFLINE` still means the send succeeded (`ok: true`). Present it honestly as "not delivered", not as a failure.
* The chat socket is separate from the room socket, and is not room-scoped. It carries no `room_id`.
* Permission is the server's decision. The client may disable obviously-invalid targets for UX, but must handle `NOT_PERMITTED` gracefully rather than assuming its own check is authoritative.
* Advanced Chat (read receipts, typing indicators, blocking, history, invites) is a bonus module and is out of scope.
* Message text is trimmed, 1–500 characters.

## Contract Source

Bruno `websocket/08 - Chat/connect-chat.yml` and `send-message.yml`.

## Acceptance Criteria

* The widget appears on Lobby, Room and Game only, and stays visible while a profile modal is open.
* Exactly one chat socket is open per tab.
* Delivery status is shown per outbound message.
* `NOT_PERMITTED` produces a clear explanation of who the user may message.
* Nothing persists chat content across a reload.

## Dependencies

Depends on the authentication flow.
