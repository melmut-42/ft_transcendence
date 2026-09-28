/**
 * Leave semantics. Before the match starts the action is LEAVE ROOM, which gives up the
 * member's team, role and seat; while the match runs it is LEAVE GAME, which forfeits
 * for the member's team (`PLAYER_FORFEIT`). Both ask for confirmation and both call the
 * same REST `Leave room` endpoint.
 */

import type { RoomStatus } from '@shared/types';

export interface LeaveAction {
  kind: 'LEAVE_ROOM' | 'LEAVE_GAME';
  label: 'LEAVE ROOM' | 'LEAVE GAME';
  confirmation: { title: string; body: string; confirmLabel: string; cancelLabel: string } | null;
}

export function leaveActionFor(status: RoomStatus): LeaveAction {
  if (status === 'IN_GAME') {
    return {
      kind: 'LEAVE_GAME',
      label: 'LEAVE GAME',
      confirmation: {
        title: 'Leave Game?',
        body: 'You will leave this match and return to the lobby. Your team forfeits the match.',
        confirmLabel: 'LEAVE GAME',
        cancelLabel: 'STAY',
      },
    };
  }
  return {
    kind: 'LEAVE_ROOM',
    label: 'LEAVE ROOM',
    confirmation: {
      title: 'Leave Room?',
      body: 'You will lose your team and role. Your seat opens for another player.',
      confirmLabel: 'LEAVE ROOM',
      cancelLabel: 'STAY',
    },
  };
}
