import { useConnectionStore } from '@shared/stores';

/**
 * Reconnecting overlay.
 *
 * The server reserves the seat for a grace period (30s in `WAITING`/`COUNTDOWN`, 60s
 * `IN_GAME`), so a drop shows this overlay and retries — it does not bounce the user to
 * the Lobby. Recovery is always a fresh `room.state` snapshot, never an event replay.
 */
export function ConnectionOverlay() {
  const status = useConnectionStore((state) => state.room.status);

  if (status !== 'RECONNECTING') return null;

  return (
    <div role="status" aria-live="polite">
      {/* TODO(design): reconnect overlay with grace-period feedback. */}
      Reconnecting…
    </div>
  );
}
