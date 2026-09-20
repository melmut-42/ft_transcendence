/**
 * Chat widget shell.
 *
 * Mounted by the app-level `ChatMount`, so it persists across Lobby, Room and Game and
 * stays visible while a profile modal is open.
 *
 * Messaging permission is the server's decision: friends, or co-members of the same
 * room while it is `WAITING`, `COUNTDOWN` or `IN_GAME`. The widget shows the outcome;
 * it does not pre-compute it.
 */
export function ChatWidget() {
  return (
    <aside aria-label="Chat">
      {/* TODO(chat): collapsed launcher, thread list and composer. */}
    </aside>
  );
}
