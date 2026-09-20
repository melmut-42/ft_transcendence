/**
 * Basic chat types, from Bruno `websocket/08 - Chat/`.
 *
 * Chat is a per-user socket (`/ws/chat`), independent of any room. Delivery is
 * live-only: no history is stored or redelivered by this contract.
 */

/** `chat.message.send` payload. */
export interface ChatSendPayload {
  to_user_id: number;
  /** Trimmed, 1..500 characters. */
  text: string;
}

/** Honest delivery reporting: the send succeeded either way. */
export type ChatDeliveryStatus = 'DELIVERED' | 'RECIPIENT_OFFLINE';

/** `ack` payload for `chat.message.send`. */
export interface ChatSendAck {
  message_id: string;
  to_user_id: number;
  sent_at: string;
  delivery_status: ChatDeliveryStatus;
}

/** `chat.message.new` payload, delivered to every open socket of the recipient. */
export interface ChatMessageNewPayload {
  message_id: string;
  from_user_id: number;
  text: string;
}
