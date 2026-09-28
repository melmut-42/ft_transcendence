/**
 * In-memory `SocketTransport` used by the mock socket layer.
 *
 * It follows the same lifecycle as `ManagedSocket` — `CONNECTING` then `OPEN`,
 * `RECONNECTING` on a simulated drop, `CLOSED` on disconnect — and hands frames to the
 * same `onMessage` callback, so the connection classes above it cannot tell the
 * difference.
 */

import type { ConnectionCloseReason, ConnectionStatus } from '../connectionState';
import type { SocketTransport, TransportOptions } from '../transport';

/** What a mock server needs from one connected transport. */
export interface MockEndpoint {
  deliver(message: unknown): void;
  isOpen(): boolean;
  simulateDrop(reconnectAfterMs?: number): void;
  simulateClose(reason: ConnectionCloseReason): void;
}

export interface MockServerBinding {
  onOpen(endpoint: MockEndpoint): void;
  onClose(endpoint: MockEndpoint): void;
  onCommand(endpoint: MockEndpoint, message: unknown): void;
}

export class MockTransport<TInbound, TOutbound>
  implements SocketTransport<TOutbound>, MockEndpoint
{
  private status: ConnectionStatus = 'IDLE';
  private readonly options: TransportOptions<TInbound>;
  private readonly server: MockServerBinding;

  constructor(options: TransportOptions<TInbound>, server: MockServerBinding) {
    this.options = options;
    this.server = server;
  }

  getStatus(): ConnectionStatus {
    return this.status;
  }

  connect(): void {
    if (this.status === 'OPEN' || this.status === 'CONNECTING') return;
    this.setStatus(this.status === 'RECONNECTING' ? 'RECONNECTING' : 'CONNECTING');
    queueMicrotask(() => {
      if (this.status !== 'CONNECTING' && this.status !== 'RECONNECTING') return;
      this.setStatus('OPEN');
      this.server.onOpen(this);
    });
  }

  disconnect(): void {
    const wasOpen = this.status === 'OPEN';
    this.setStatus('CLOSED', 'CLIENT_DISCONNECT');
    if (wasOpen) this.server.onClose(this);
  }

  send(message: TOutbound): boolean {
    if (this.status !== 'OPEN') return false;
    // Server replies arrive asynchronously, like real frames.
    queueMicrotask(() => this.server.onCommand(this, message));
    return true;
  }

  deliver(message: unknown): void {
    if (this.status !== 'OPEN') return;
    this.options.onMessage?.(structuredClone(message) as TInbound);
  }

  isOpen(): boolean {
    return this.status === 'OPEN';
  }

  simulateDrop(reconnectAfterMs = 1_500): void {
    if (this.status !== 'OPEN') return;
    this.server.onClose(this);
    this.setStatus('RECONNECTING', 'TRANSPORT_DROP');
    setTimeout(() => this.connect(), reconnectAfterMs);
  }

  simulateClose(reason: ConnectionCloseReason): void {
    if (this.status !== 'OPEN') return;
    this.server.onClose(this);
    this.setStatus('CLOSED', reason);
  }

  private setStatus(status: ConnectionStatus, reason?: ConnectionCloseReason): void {
    this.status = status;
    this.options.onStatusChange?.(status, reason);
  }
}
