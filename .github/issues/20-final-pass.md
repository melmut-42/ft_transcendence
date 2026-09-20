## Description
Final integration and frontend quality pass, run once the feature work has landed.

## Tasks

* Route integration end to end.
* REST integration: every call, every documented error code.
* WebSocket integration: both sockets, all events.
* Responsive verification across the supported breakpoints.
* Keyboard and focus behavior across every screen and modal.
* Chrome console cleanup.
* Error states.
* Loading states.
* Reconnect scenarios.
* Contract consistency: every field the UI renders exists in Bruno, with Bruno's name and type.

## Acceptance Criteria

* **No frontend console warnings or errors in the supported evaluation flow.**
* The full evaluation flow works end to end: register, log in, create or join a room, pick team and role, ready up, play a full match, see results, return to the Lobby, log out.
* A refresh at any point recovers the correct screen from server state.
* A network drop at any point recovers without data loss inside the grace period.
* Every screen is fully operable by keyboard.
* Every screen matches the contract, with no behavior that the contract does not define.
* No credential or token appears in browser storage, a request header, or a URL.

## Dependencies

Depends on all other frontend issues.
