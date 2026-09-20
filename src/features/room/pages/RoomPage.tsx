/**
 * Room screen shell.
 *
 * One route covers every room state: `WAITING`, `COUNTDOWN`, `IN_GAME` and `FINISHED`.
 * The screen is chosen from authoritative `room.status`, never from local navigation
 * history — refreshing recovers the right view from the server snapshot.
 */
export function RoomPage() {
  return (
    <section>
      <h1>Room</h1>
      {/* TODO(room): render by room.status — waiting, countdown, game, results. */}
    </section>
  );
}
