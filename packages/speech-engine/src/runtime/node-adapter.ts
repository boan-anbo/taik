/**
 * Node.js / Bun runtime adapter
 * Uses 'ws' package for WebSocket, no microphone support
 */

import type {
  RuntimeAdapter,
  RuntimeType,
  WebSocketAdapter,
  WebSocketConnection,
  AudioCaptureAdapter,
  AudioStream,
  FileAdapter,
} from './adapter.js';
import type { MicrophoneOptions } from '../types/audio.js';
import { UnsupportedError } from '../utils/errors.js';

/**
 * Node.js WebSocket connection wrapper
 */
class NodeWebSocketConnection implements WebSocketConnection {
  private ws: import('ws').WebSocket;
  private wsModule: typeof import('ws');

  constructor(ws: import('ws').WebSocket, wsModule: typeof import('ws')) {
    this.ws = ws;
    this.wsModule = wsModule;
  }

  onOpen(callback: () => void): void {
    this.ws.on('open', callback);
  }

  onMessage(callback: (data: ArrayBuffer | string) => void): void {
    this.ws.on('message', (data: Buffer | ArrayBuffer | Buffer[], isBinary: boolean) => {
      if (isBinary) {
        // Convert Buffer to ArrayBuffer
        if (Buffer.isBuffer(data)) {
          const buffer = new ArrayBuffer(data.byteLength);
          new Uint8Array(buffer).set(new Uint8Array(data.buffer, data.byteOffset, data.byteLength));
          callback(buffer);
        } else if (data instanceof ArrayBuffer) {
          callback(data);
        }
      } else {
        callback(data.toString());
      }
    });
  }

  onError(callback: (error: Error) => void): void {
    this.ws.on('error', callback);
  }

  onClose(callback: (code: number, reason: string) => void): void {
    this.ws.on('close', (code: number, reason: Buffer) => {
      callback(code, reason.toString());
    });
  }

  send(data: ArrayBuffer | string): void {
    if (data instanceof ArrayBuffer) {
      this.ws.send(Buffer.from(data));
    } else {
      this.ws.send(data);
    }
  }

  close(code?: number, reason?: string): void {
    this.ws.close(code, reason);
  }

  getReadyState(): 'connecting' | 'open' | 'closing' | 'closed' {
    const WS = this.wsModule.WebSocket;
    switch (this.ws.readyState) {
      case WS.CONNECTING:
        return 'connecting';
      case WS.OPEN:
        return 'open';
      case WS.CLOSING:
        return 'closing';
      case WS.CLOSED:
      default:
        return 'closed';
    }
  }
}

/**
 * Node.js WebSocket adapter
 */
class NodeWebSocketAdapter implements WebSocketAdapter {
  private wsModule: typeof import('ws') | null = null;

  private async getWsModule(): Promise<typeof import('ws')> {
    if (!this.wsModule) {
      this.wsModule = await import('ws');
    }
    return this.wsModule;
  }

  create(url: string, protocols?: string[]): WebSocketConnection {
    // Synchronous creation - module should be pre-loaded
    // For async loading, use createAsync
    throw new Error('Use createAsync for Node.js WebSocket');
  }

  async createAsync(url: string, protocols?: string[]): Promise<WebSocketConnection> {
    const wsModule = await this.getWsModule();
    const ws = new wsModule.WebSocket(url, protocols);
    return new NodeWebSocketConnection(ws, wsModule);
  }
}

/**
 * Node.js audio capture adapter (not supported)
 */
class NodeAudioCaptureAdapter implements AudioCaptureAdapter {
  private runtime: RuntimeType;

  constructor(runtime: RuntimeType) {
    this.runtime = runtime;
  }

  isSupported(): boolean {
    return false;
  }

  async captureFromMicrophone(_options: MicrophoneOptions): Promise<AudioStream> {
    throw new UnsupportedError('Microphone capture', this.runtime);
  }
}

/**
 * Node.js file adapter
 */
class NodeFileAdapter implements FileAdapter {
  async readFile(path: string): Promise<ArrayBuffer> {
    // Handle URLs
    if (path.startsWith('http://') || path.startsWith('https://')) {
      const response = await fetch(path);
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
      }
      return response.arrayBuffer();
    }

    // Handle local files
    const fs = await import('fs/promises');
    const nodeBuffer = await fs.readFile(path);
    // Copy to a proper ArrayBuffer to avoid SharedArrayBuffer issues
    const arrayBuffer = new ArrayBuffer(nodeBuffer.byteLength);
    new Uint8Array(arrayBuffer).set(new Uint8Array(nodeBuffer.buffer, nodeBuffer.byteOffset, nodeBuffer.byteLength));
    return arrayBuffer;
  }

  async *createReadStream(path: string): AsyncIterable<ArrayBuffer> {
    // Handle URLs
    if (path.startsWith('http://') || path.startsWith('https://')) {
      const response = await fetch(path);
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          yield value.buffer;
        }
      } finally {
        reader.releaseLock();
      }
      return;
    }

    // Handle local files
    const fs = await import('fs');
    const stream = fs.createReadStream(path);

    for await (const chunk of stream) {
      if (Buffer.isBuffer(chunk)) {
        // Copy to proper ArrayBuffer to avoid SharedArrayBuffer issues
        const arrayBuffer = new ArrayBuffer(chunk.byteLength);
        new Uint8Array(arrayBuffer).set(new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength));
        yield arrayBuffer;
      }
    }
  }

  async exists(path: string): Promise<boolean> {
    // Handle URLs
    if (path.startsWith('http://') || path.startsWith('https://')) {
      try {
        const response = await fetch(path, { method: 'HEAD' });
        return response.ok;
      } catch {
        return false;
      }
    }

    // Handle local files
    const fs = await import('fs/promises');
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Extended WebSocket adapter with async creation
 */
export interface AsyncWebSocketAdapter extends WebSocketAdapter {
  createAsync(url: string, protocols?: string[]): Promise<WebSocketConnection>;
}

/**
 * Node.js runtime adapter
 */
export class NodeAdapter implements RuntimeAdapter {
  readonly type: RuntimeType;
  readonly websocket: AsyncWebSocketAdapter;
  readonly audio: AudioCaptureAdapter;
  readonly file: FileAdapter;

  constructor(runtime: RuntimeType = 'node') {
    this.type = runtime;
    this.websocket = new NodeWebSocketAdapter();
    this.audio = new NodeAudioCaptureAdapter(runtime);
    this.file = new NodeFileAdapter();
  }
}
