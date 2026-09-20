/**
 * Room REST bindings — Bruno `rest-api/03 - Rooms/`.
 *
 * REST owns room creation, membership and snapshots. Team, role, readiness and every
 * gameplay mutation are WebSocket-only and must not appear here.
 *
 * `POST /api/rooms` takes no body: the current contract has no room-name field.
 */

import { apiRequest } from '@shared/api';
import type { CreateRoomResponse, Room, RoomLookupResponse } from '@shared/types';

export const createRoom = (): Promise<CreateRoomResponse> =>
  apiRequest('/rooms', { method: 'POST' });

/** Resolve a shareable `^[A-Z0-9]{6}$` code to a `room_id` before joining. */
export const lookupRoomByCode = (roomCode: string): Promise<RoomLookupResponse> =>
  apiRequest(`/rooms/lookup/${encodeURIComponent(roomCode)}`);

export const joinRoom = (roomId: number): Promise<Room> =>
  apiRequest(`/rooms/${roomId}/members`, { method: 'POST' });

/** Role-safe snapshot: an Operative never receives unrevealed card colors. */
export const getRoomSnapshot = (roomId: number): Promise<Room> => apiRequest(`/rooms/${roomId}`);

/** Legal in every room status. During `IN_GAME` it forfeits the match. */
export const leaveRoom = (roomId: number): Promise<void> =>
  apiRequest(`/rooms/${roomId}/members/me`, { method: 'DELETE' });
