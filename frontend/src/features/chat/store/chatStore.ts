/**
 * Chat store — live session state only.
 *
 * Basic chat has no persisted history in this contract, so nothing here is written to
 * storage or restored on reload: messages exist for the lifetime of the tab.
 */

import { create } from 'zustand';

import type { ChatDeliveryStatus } from '@shared/types';

/** One message as this client saw it, inbound or outbound. */
export interface ChatMessage {
  message_id: string;
  /** The other participant, whichever direction the message went. */
  peer_user_id: number;
  direction: 'IN' | 'OUT';
  text: string;
  sent_at: string;
  /** Outbound only: `DELIVERED` or `RECIPIENT_OFFLINE`, reported honestly by the ack. */
  delivery_status: ChatDeliveryStatus | null;
}

interface ChatState {
  /** Keyed by peer `user_id`. */
  threads: Record<number, ChatMessage[]>;
  openPeerId: number | null;

  openThread: (peerUserId: number | null) => void;
  clear: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  threads: {},
  openPeerId: null,

  // TODO(chat): add append-message and delivery-status reducers.
  openThread: (openPeerId) => set({ openPeerId }),
  clear: () => set({ threads: {}, openPeerId: null }),
}));
