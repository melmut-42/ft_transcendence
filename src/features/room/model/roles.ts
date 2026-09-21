/**
 * Role-selection state for the lobby's SPYMASTER / OPERATIVE selector.
 *
 * It mirrors the server's rules — a team first, one Spymaster per team, changes only
 * in `WAITING` or `COUNTDOWN` — so the UI can show why an option is unavailable. The
 * server still validates every `room.role.select`.
 */

import type { Room, RoomMember, RoomRole } from '@shared/types';

export type RoleUnavailableReason =
  | 'TEAM_REQUIRED'
  /** Another member of the same team already holds the Spymaster seat. */
  | 'SPYMASTER_TAKEN'
  /** The room is `IN_GAME`, `FINISHED` or `CLOSED`; roles are locked. */
  | 'LOCKED';

export interface RoleOption {
  role: RoomRole;
  selected: boolean;
  available: boolean;
  reason: RoleUnavailableReason | null;
  /** The member occupying the Spymaster seat, when `reason` is `SPYMASTER_TAKEN`. */
  occupiedBy: RoomMember | null;
}

export interface RoleSelection {
  current: RoomRole | null;
  /** Ready means the selection is confirmed; changing role clears it. */
  confirmed: boolean;
  changeable: boolean;
  options: [RoleOption, RoleOption];
}

export function roleSelection(room: Room, userId: number): RoleSelection | null {
  const me = room.players.find((p) => p.user_id === userId);
  if (!me) return null;
  const locked = room.status !== 'WAITING' && room.status !== 'COUNTDOWN';

  const option = (role: RoomRole): RoleOption => {
    const holder =
      role === 'SPYMASTER' && me.team
        ? (room.players.find(
            (p) => p.team === me.team && p.role === 'SPYMASTER' && p.user_id !== userId,
          ) ?? null)
        : null;
    let reason: RoleUnavailableReason | null = null;
    if (locked) reason = 'LOCKED';
    else if (!me.team) reason = 'TEAM_REQUIRED';
    else if (holder) reason = 'SPYMASTER_TAKEN';
    return {
      role,
      selected: me.role === role,
      available: reason === null,
      reason,
      occupiedBy: holder,
    };
  };

  return {
    current: me.role,
    confirmed: me.ready,
    changeable: !locked,
    options: [option('SPYMASTER'), option('OPERATIVE')],
  };
}
