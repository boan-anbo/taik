/**
 * Edge runtime adapter (Cloudflare Workers, Deno, Vercel Edge, etc.)
 * Uses native WebSocket, no microphone support, fetch-based file access
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
 * Edge WebSocket connection wrapper
 * Uses the standard WebSocket API available in edge runtimes
 */
class EdgeWebSocketConnection implements WebSocketConnection {
  private ws: WebSocket;

  constructor(url: string, protocols?: string[]) {
    this.ws = new WebSocket(url, protocols);
    // Note: binaryType might not be configurable in all edge runtimes
    if ('binaryType' in this.ws) {
      this.ws.binaryType = 'arraybuffer';
    }
  }

  onOpen(callback: () => void): void {
    this.ws.addEventListener('open', callback);
  }

  onMessage(callback: (data: ArrayBuffer | string) => void): void {
    this.ws.addEventListener('message', (event) => {
      callback(event.data as ArrayBuffer | string);
    });
  }

  onError(callback: (error: Error) => void): void {
    this.ws.addEventListener('error', () => {
      callback(new Error('WebSocket error'));
    });
  }

  onClose(callback: (code: number, reason: string) => void): void {
    this.ws.addEventListener('close', (event) => {
      callback(event.code, event.reason);
    });
  }

  send(data: ArrayBuffer | string): void {
    this.ws.send(data);
  }

  close(code?: number, reason?: string): void {
    this.ws.close(code, reason);
  }

  getReadyState(): 'connecting' | 'open' | 'closing' | 'closed' {
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return 'connecting';
      case WebSocket.OPEN:
        return 'open';
      case WebSocket.CLOSING:
        return 'closing';
      case WebSocket.CLOSED:
      default:
        return 'closed';
    }
  }
}

/**
 * Edge WebSocket adapter
 */
class EdgeWebSocketAdapter implements WebSocketAdapter {
  create(url: string, protocols?: string[]): WebSocketConnection {
    return new EdgeWebSocketConnection(url, protocols);
  }
}

/**
 * Edge audio capture adapter (not supported)
 */
class EdgeAudioCaptureAdapter implements AudioCaptureAdapter {
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
 * Edge file adapter (fetch-based only)
 */
class EdgeFileAdapter implements FileAdapter {
  async readFile(path: string): Promise<ArrayBuffer> {
    // Edge runtimes can only access files via HTTP
    if (!path.startsWith('http://') && !path.startsWith('https://')) {
      throw new Error(
        'Edge runtimes can only access files via HTTP URLs. ' +
          'Local file paths are not supported.'
      );
    }

    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
    }
    return response.arrayBuffer();
  }

  async *createReadStream(path: string): AsyncIterable<ArrayBuffer> {
    if (!path.startsWith('http://') && !path.startsWith('https://')) {
      throw new Error(
        'Edge runtimes can only access files via HTTP URLs. ' +
          'Local file paths are not supported.'
      );
    }

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
  }

  async exists(path: string): Promise<boolean> {
    if (!path.startsWith('http://') && !path.startsWith('https://')) {
      return false;
    }

    try {
      const response = await fetch(path, { method: 'HEAD' });
      return response.ok;
    } catch {
      return false;
    }
  }
}

/**
 * Edge runtime adapter
 */
export class EdgeAdapter implements RuntimeAdapter {
  readonly type: RuntimeType;
  readonly websocket: WebSocketAdapter;
  readonly audio: AudioCaptureAdapter;
  readonly file: FileAdapter;

  constructor(runtime: RuntimeType = 'unknown') {
    this.type = runtime;
    this.websocket = new EdgeWebSocketAdapter();
    this.audio = new EdgeAudioCaptureAdapter(runtime);
    this.file = new EdgeFileAdapter();
  }
}
