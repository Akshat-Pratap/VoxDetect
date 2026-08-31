/**
 * src/services/websocket.ts — WebSocket factory for /v1/stream.
 * Manages the WebSocket lifecycle and exposes typed callbacks.
 */
import type { StreamMessage, StreamMetadata, StreamChunkResult } from '@/types';

const WS_BASE = (import.meta as any).env?.VITE_WS_URL || 'ws://localhost:8000';

export type WSEventHandlers = {
  onReady?: (connectionId: string) => void;
  onRiskUpdate?: (data: StreamChunkResult) => void;
  onError?: (code: string, message: string) => void;
  onClose?: (clean: boolean) => void;
  onConnecting?: () => void;
};

export class VoxDetectWebSocket {
  private ws: WebSocket | null = null;
  private handlers: WSEventHandlers;
  private _connectionId: string | null = null;
  private _closed = false;

  constructor(handlers: WSEventHandlers) {
    this.handlers = handlers;
  }

  get connectionId() {
    return this._connectionId;
  }

  connect(metadata: StreamMetadata): void {
    if (this.ws) this.close();
    this._closed = false;
    this.handlers.onConnecting?.();

    const url = `${WS_BASE}/v1/stream`;
    this.ws = new WebSocket(url);
    this.ws.binaryType = 'arraybuffer';

    this.ws.onopen = () => {
      // Send JSON metadata frame first
      this.ws!.send(JSON.stringify(metadata));
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string) as StreamMessage;
        if (data.type === 'ready') {
          this._connectionId = data.connection_id;
          this.handlers.onReady?.(data.connection_id);
        } else if (data.type === 'risk_update') {
          this.handlers.onRiskUpdate?.(data);
        } else if (data.type === 'error') {
          this.handlers.onError?.(data.code, data.message);
        }
      } catch {
        // Malformed frame — ignore
      }
    };

    this.ws.onerror = () => {
      this.handlers.onError?.('WS_ERROR', 'WebSocket connection error.');
    };

    this.ws.onclose = (event) => {
      if (!this._closed) {
        this.handlers.onClose?.(event.wasClean);
      }
    };
  }

  /**
   * Send a binary audio chunk to the server.
   * The chunk must be a WAV/PCM byte buffer.
   */
  sendAudioChunk(chunk: ArrayBuffer | Blob): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(chunk);
    }
  }

  get isOpen(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  close(): void {
    this._closed = true;
    if (this.ws) {
      if (
        this.ws.readyState === WebSocket.OPEN ||
        this.ws.readyState === WebSocket.CONNECTING
      ) {
        this.ws.close(1000, 'Client disconnect');
      }
      this.ws = null;
    }
  }
}
