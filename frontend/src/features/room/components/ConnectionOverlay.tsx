import { useConnectionStore } from '@shared/stores';
import { LoadingDots, Overlay } from '@shared/ui';

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
    <Overlay level="overlay">
      <div
        role="status"
        aria-live="polite"
        className="flex flex-col items-center gap-4 rounded-lg bg-surface p-5 text-center shadow-modal motion-safe:animate-pop-in"
      >
        <LoadingDots label="Reconnecting" />
        <p className="text-xl font-black">Reconnecting…</p>
        <p className="text-md text-text-muted">Your seat is held while we reconnect you.</p>
      </div>
    </Overlay>
  );
}
