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
  WsErrorCode,
  WsErrorMessage,
} from '@shared/types';

import type { ConnectionCloseReason, ConnectionStatus } from './connectionState';
import { EventOrderTracker } from './eventOrdering';
import { createTransport } from './transport';
import type { SocketTransport } from './transport';

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

/**
 * Why a `request()` did not get an ack: the server's error `code`, or `NOT_SENT` when the
 * socket was not open and `CONNECTION_LOST` when it closed before the answer arrived.
 */
export class RoomCommandError extends Error {
  readonly code: WsErrorCode | 'NOT_SENT' | 'CONNECTION_LOST';
  readonly details: Record<string, unknown>;

  constructor(
    code: RoomCommandError['code'],
    message: string,
    details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = 'RoomCommandError';
    this.code = code;
    this.details = details;
  }
}

interface PendingRequest {
  resolve: (ack: AckMessage) => void;
  reject: (error: RoomCommandError) => void;
}

export class RoomConnection {
  private readonly socket: SocketTransport<RoomCommand>;
  private readonly ordering = new EventOrderTracker();
  private readonly pending = new Map<string, PendingRequest>();

  readonly roomId: number;
  private readonly handlers: RoomConnectionHandlers;

  constructor(roomId: number, handlers: RoomConnectionHandlers = {}) {
    this.roomId = roomId;
    this.handlers = handlers;
    this.socket = createTransport<RoomServerMessage, RoomCommand>({
      name: `room:${roomId}`,
      path: wsRoomPath(roomId),
      onStatusChange: (status, reason) => {
        if (status === 'CONNECTING' || status === 'RECONNECTING') {
          // The next `room.state` is the recovery snapshot, so prior ordering is moot.
          this.ordering.reset();
        }
        // An answer never arrives over a socket that closed; the snapshot says what happened.
        if (status !== 'OPEN') this.rejectPending();
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
   * Drop local ordering and take a fresh `room.state`: the server sends the canonical
   * snapshot on every connect. Used after an event gap, and after a command error that
   * shows local state is behind the server's.
   */
  resync(): void {
    this.socket.disconnect();
    this.socket.connect();
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

  /**
   * Send one command and settle when the server answers it: resolved by its `ack`,
   * rejected with a `RoomCommandError` by its `error`. The resulting state still arrives
   * as room events, so the answer is for feedback only.
   */
  request<TCommand extends RoomCommand>(
    type: TCommand['type'],
    payload: TCommand['payload'],
  ): Promise<AckMessage> {
    return new Promise((resolve, reject) => {
      const requestId = createRequestId();
      this.pending.set(requestId, { resolve, reject });
      const envelope = { type, request_id: requestId, payload } as RoomCommand;
      if (!this.socket.send(envelope)) {
        this.pending.delete(requestId);
        reject(new RoomCommandError('NOT_SENT', 'The room connection is not open.'));
      }
    });
  }

  private rejectPending(): void {
    const pending = [...this.pending.values()];
    this.pending.clear();
    pending.forEach((request) =>
      request.reject(
        new RoomCommandError('CONNECTION_LOST', 'The room connection closed before an answer.'),
      ),
    );
  }

  private dispatch(message: RoomServerMessage): void {
    if (message.type === 'ack') {
      this.pending.get(message.request_id)?.resolve(message);
      this.pending.delete(message.request_id);
      this.handlers.onAck?.(message);
      return;
    }
    if (message.type === 'error') {
      const request =
        message.request_id === null ? undefined : this.pending.get(message.request_id);
      if (request && message.request_id !== null) {
        this.pending.delete(message.request_id);
        const { code, message: text, details } = message.error;
        request.reject(new RoomCommandError(code, text, details));
      }
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
