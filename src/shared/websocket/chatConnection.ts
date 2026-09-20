/**
 * The per-user chat socket (`/ws/chat`), independent of any room.
 *
 * Same cookie-only authentication as the room socket. Basic chat is live-only: this
 * connection stores no history, because the contract defines none.
 */

import { WS_CHAT_PATH } from '@shared/constants';
import { createRequestId } from '@shared/utils';
import type {
  AckMessage,
  ChatCommand,
  ChatMessageNewEvent,
  ChatSendAck,
  ChatSendPayload,
  ChatServerMessage,
  WsErrorMessage,
} from '@shared/types';

import type { ConnectionCloseReason, ConnectionStatus } from './connectionState';
import { ManagedSocket } from './managedSocket';

export interface ChatConnectionHandlers {
  onStatusChange?: (status: ConnectionStatus, reason?: ConnectionCloseReason) => void;
  onMessage?: (event: ChatMessageNewEvent) => void;
  /** Carries `delivery_status`: `DELIVERED` or `RECIPIENT_OFFLINE`. */
  onAck?: (ack: AckMessage<ChatSendAck>) => void;
  onError?: (error: WsErrorMessage) => void;
}

export class ChatConnection {
  private readonly socket: ManagedSocket<ChatServerMessage, ChatCommand>;

  private readonly handlers: ChatConnectionHandlers;

  constructor(handlers: ChatConnectionHandlers = {}) {
    this.handlers = handlers;
    this.socket = new ManagedSocket<ChatServerMessage, ChatCommand>({
      name: 'chat',
      path: WS_CHAT_PATH,
      onStatusChange: (status, reason) => this.handlers.onStatusChange?.(status, reason),
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

  /** Returns the `request_id`, or `null` when the socket is not open. */
  send(payload: ChatSendPayload): string | null {
    const requestId = createRequestId();
    return this.socket.send({ type: 'chat.message.send', request_id: requestId, payload })
      ? requestId
      : null;
  }

  private dispatch(message: ChatServerMessage): void {
    switch (message.type) {
      case 'ack':
        this.handlers.onAck?.(message);
        return;
      case 'error':
        this.handlers.onError?.(message);
        return;
      case 'chat.message.new':
        this.handlers.onMessage?.(message);
    }
  }
}
