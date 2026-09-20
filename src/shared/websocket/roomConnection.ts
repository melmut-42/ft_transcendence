/**
 * The single owner of the room WebSocket.
 *
 * One socket carries both `room.*` and `game.*` events, so Room and Game must consume
 * derived state from this one connection rather than opening competing sockets.
 * The app layer owns the instance;
 * `features/room` and `features/game` only read the state it publishes.
 *
 * This module deliberately implements no game rule. It correlates `request_id`s,
 * tracks `event_id` ordering, and hands every event to its subscriber unchanged.
 */

import { wsRoomPath } from '@shared/constants';
import { createRequestId } from '@shared/utils';
import type {
  AckMessage,
  RoomCommand,
  RoomServerEvent,
  RoomServerMessage,
  WsErrorMessage,
} from '@shared/types';

import type { ConnectionCloseReason, ConnectionStatus } from './connectionState';
import { EventOrderTracker } from './eventOrdering';
import { ManagedSocket } from './managedSocket';

export interface RoomConnectionHandlers {
  onStatusChange?: (status: ConnectionStatus, reason?: ConnectionCloseReason) => void;
  /** Authoritative room/game events. Apply state from these, never from an ack. */
  onEvent?: (event: RoomServerEvent) => void;
  /** Command confirmation, correlated by `request_id`. UI feedback only. */
  onAck?: (ack: AckMessage) => void;
  onError?: (error: WsErrorMessage) => void;
  /**
   * A suspected `event_id` gap, or a fresh (re)connect. Both recover the same way:
   * discard local state and apply the next `room.state` snapshot.
   */
  onSnapshotRequired?: () => void;
}

export class RoomConnection {
  private readonly socket: ManagedSocket<RoomServerMessage, RoomCommand>;
  private readonly ordering = new EventOrderTracker();

  readonly roomId: number;
  private readonly handlers: RoomConnectionHandlers;

  constructor(roomId: number, handlers: RoomConnectionHandlers = {}) {
    this.roomId = roomId;
    this.handlers = handlers;
    this.socket = new ManagedSocket<RoomServerMessage, RoomCommand>({
      name: `room:${roomId}`,
      path: wsRoomPath(roomId),
      onStatusChange: (status, reason) => {
        if (status === 'CONNECTING' || status === 'RECONNECTING') {
          // The next `room.state` is the recovery snapshot, so prior ordering is moot.
          this.ordering.reset();
        }
        this.handlers.onStatusChange?.(status, reason);
      },
      onMessage: (message) => this.dispatch(message),
    });
  }

  connect(): void {
    this.socket.connect();
  }

  disconnect(): void {
    this.socket.disconnect();
  }

  getStatus(): ConnectionStatus {
    return this.socket.getStatus();
  }

  /**
   * Send one command and return its `request_id` so the caller can correlate the ack.
   * Returns `null` when the socket is not open.
   */
  send<TCommand extends RoomCommand>(
    type: TCommand['type'],
    payload: TCommand['payload'],
  ): string | null {
    const requestId = createRequestId();
    const envelope = { type, request_id: requestId, payload } as RoomCommand;
    return this.socket.send(envelope) ? requestId : null;
  }

  private dispatch(message: RoomServerMessage): void {
    if (message.type === 'ack') {
      this.handlers.onAck?.(message);
      return;
    }
    if (message.type === 'error') {
      this.handlers.onError?.(message);
      return;
    }

    if (message.type === 'room.state') {
      this.ordering.accept(message.event_id);
      this.handlers.onEvent?.(message);
      return;
    }

    if (!this.ordering.accept(message.event_id)) {
      this.handlers.onSnapshotRequired?.();
      return;
    }
    this.handlers.onEvent?.(message);
  }
}
