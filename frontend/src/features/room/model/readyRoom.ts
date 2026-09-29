/**
 * What the Ready Room shows, read from the authoritative room snapshot.
 *
 * Nothing here decides anything the server owns. The start predicate is `room.startable`,
 * the countdown is `room.status` and the server's seconds, and every command is validated
 * again by the server; these helpers only arrange the members for display and explain why
 * a control is unavailable.
 */

import type { Room, RoomMember, Team } from '@shared/types';

/**
 * Seats drawn per team while it is short of players: a startable team needs a Spymaster
 * and at least one Operative. Only seats that can still be filled are drawn, by players
 * who have not picked a team yet or by players the room still has room for.
 */
const SEATS_PER_TEAM = 2;

export interface TeamRoster {
  team: Team;
  members: RoomMember[];
  /** Empty seats drawn under the members; never more than can still be filled. */
  emptySeats: number;
}

export interface Rosters {
  red: TeamRoster;
  blue: TeamRoster;
  /** Members who have not chosen a team yet. */
  unassigned: RoomMember[];
}

const byJoinOrder = (a: RoomMember, b: RoomMember): number =>
  a.joined_at.localeCompare(b.joined_at);

export function rosters(room: Room): Rosters {
  const members = [...room.players].sort(byJoinOrder);
  const red = members.filter((p) => p.team === 'RED');
  const blue = members.filter((p) => p.team === 'BLUE');
  const unassigned = members.filter((p) => p.team === null);
  let open = Math.max(0, room.max_players - room.player_count) + unassigned.length;
  const seats = (count: number): number => {
    const seatsShown = Math.min(Math.max(0, SEATS_PER_TEAM - count), open);
    open -= seatsShown;
    return seatsShown;
  };
  return {
    red: { team: 'RED', members: red, emptySeats: seats(red.length) },
    blue: { team: 'BLUE', members: blue, emptySeats: seats(blue.length) },
    unassigned,
  };
}

export const readyCount = (room: Room): number => room.players.filter((p) => p.ready).length;

export const isFull = (room: Room): boolean => room.player_count >= room.max_players;

/** The headline over the teams: the countdown, a full room, or still waiting. */
export type RoomPhase = 'COUNTDOWN' | 'FULL' | 'WAITING';

export function roomPhase(room: Room): RoomPhase {
  if (room.status === 'COUNTDOWN') return 'COUNTDOWN';
  return isFull(room) ? 'FULL' : 'WAITING';
}

/** Team and role only change while the room is waiting; the countdown locks them. */
export const setupLocked = (room: Room): boolean => room.status !== 'WAITING';

export type ReadyState =
  | { kind: 'READY' }
  | { kind: 'AVAILABLE' }
  | { kind: 'UNAVAILABLE'; reason: 'TEAM_REQUIRED' | 'ROLE_REQUIRED' | 'LOCKED' };

/** Ready needs a team and a role (`TEAM_REQUIRED`, `ROLE_REQUIRED`), and a waiting room. */
export function readyState(room: Room, me: RoomMember): ReadyState {
  if (setupLocked(room)) return { kind: 'UNAVAILABLE', reason: 'LOCKED' };
  if (me.ready) return { kind: 'READY' };
  if (!me.team) return { kind: 'UNAVAILABLE', reason: 'TEAM_REQUIRED' };
  if (!me.role) return { kind: 'UNAVAILABLE', reason: 'ROLE_REQUIRED' };
  return { kind: 'AVAILABLE' };
}

export const findMember = (room: Room, userId: number | undefined): RoomMember | null =>
  room.players.find((p) => p.user_id === userId) ?? null;
