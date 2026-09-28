/**
 * In-memory chat server speaking the Bruno `/ws/chat` contract: `chat.message.send`
 * acks, inbound `chat.message.new`, and `room.invite.received`.
 */

import type {
  AckMessage,
  ChatCommand,
  ChatMessageNewEvent,
  ChatSendAck,
  RoomInviteReceivedEvent,
} from '@shared/types';

import type { MockEndpoint, MockServerBinding } from './mockTransport';
import type { MockPlayer } from './mockRoomServer';

export class MockChatServer implements MockServerBinding {
  private readonly endpoints = new Set<MockEndpoint>();
  private seq = 0;
  /** User IDs treated as offline; sends to them report `RECIPIENT_OFFLINE`. */
  readonly offline = new Set<number>();

  onOpen(endpoint: MockEndpoint): void {
    this.endpoints.add(endpoint);
  }

  onClose(endpoint: MockEndpoint): void {
    this.endpoints.delete(endpoint);
  }

  onCommand(endpoint: MockEndpoint, raw: unknown): void {
    const command = raw as ChatCommand;
    const ack: AckMessage<ChatSendAck> = {
      type: 'ack',
      request_id: command.request_id,
      ok: true,
      payload: {
        message_id: `msg_${String(++this.seq).padStart(6, '0')}`,
        to_user_id: command.payload.to_user_id,
        sent_at: new Date().toISOString(),
        delivery_status: this.offline.has(command.payload.to_user_id)
          ? 'RECIPIENT_OFFLINE'
          : 'DELIVERED',
      },
    };
    endpoint.deliver(ack);
  }

  /** A friend sends this user a direct message. */
  messageReceived(fromUserId: number, text: string): void {
    const event: ChatMessageNewEvent = {
      type: 'chat.message.new',
      event_id: this.nextEventId(),
      sent_at: new Date().toISOString(),
      payload: {
        message_id: `msg_${String(++this.seq).padStart(6, '0')}`,
        from_user_id: fromUserId,
        text,
      },
    };
    this.broadcast(event);
  }

  /** A friend invites this user to a room. */
  inviteReceived(from: MockPlayer, roomId: number, roomCode: string): void {
    const event: RoomInviteReceivedEvent = {
      type: 'room.invite.received',
      event_id: this.nextEventId(),
      sent_at: new Date().toISOString(),
      payload: {
        room_id: roomId,
        room_code: roomCode,
        from_user: { user_id: from.user_id, username: from.username },
      },
    };
    this.broadcast(event);
  }

  dropConnection(reconnectAfterMs?: number): void {
    [...this.endpoints].forEach((endpoint) => endpoint.simulateDrop(reconnectAfterMs));
  }

  private broadcast(event: unknown): void {
    this.endpoints.forEach((endpoint) => endpoint.deliver(event));
  }

  private nextEventId(): string {
    return `evt_c${String(++this.seq).padStart(6, '0')}`;
  }
}
