/**
 * Browser runtime adapter
 * Uses native browser APIs: WebSocket, MediaDevices, fetch
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
import { UnsupportedError, AudioError } from '../utils/errors.js';

/**
 * Browser WebSocket connection wrapper
 */
class BrowserWebSocketConnection implements WebSocketConnection {
  private ws: WebSocket;

  constructor(url: string, protocols?: string[]) {
    this.ws = new WebSocket(url, protocols);
    this.ws.binaryType = 'arraybuffer';
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
 * Browser WebSocket adapter
 */
class BrowserWebSocketAdapter implements WebSocketAdapter {
  create(url: string, protocols?: string[]): WebSocketConnection {
    return new BrowserWebSocketConnection(url, protocols);
  }
}

/**
 * Browser microphone audio stream
 */
class BrowserAudioStream implements AudioStream {
  private mediaStream: MediaStream;
  private audioContext: AudioContext;
  private source: MediaStreamAudioSourceNode;
  private processor: ScriptProcessorNode;
  private onDataCallback?: (chunk: ArrayBuffer) => void;
  private onErrorCallback?: (error: Error) => void;
  private stopped = false;

  constructor(
    mediaStream: MediaStream,
    sampleRate: number
  ) {
    this.mediaStream = mediaStream;
    this.audioContext = new AudioContext({ sampleRate });
    this.source = this.audioContext.createMediaStreamSource(mediaStream);

    // Use ScriptProcessorNode for audio processing
    // Note: This is deprecated but AudioWorklet requires more setup
    // and isn't supported in all browsers yet
    const bufferSize = 4096;
    this.processor = this.audioContext.createScriptProcessor(bufferSize, 1, 1);

    this.processor.onaudioprocess = (event) => {
      if (this.stopped) return;

      const inputData = event.inputBuffer.getChannelData(0);
      const pcm16 = this.float32ToPcm16(inputData);

      if (this.onDataCallback) {
        this.onDataCallback(this.toArrayBuffer(pcm16.buffer));
      }
    };

    this.source.connect(this.processor);
    this.processor.connect(this.audioContext.destination);
  }

  private float32ToPcm16(float32: Float32Array): Int16Array {
    const pcm16 = new Int16Array(float32.length);
    for (let i = 0; i < float32.length; i++) {
      const s = Math.max(-1, Math.min(1, float32[i]!));
      pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return pcm16;
  }

  private toArrayBuffer(buffer: ArrayBufferLike): ArrayBuffer {
    if (buffer instanceof ArrayBuffer) {
      return buffer;
    }
    // Handle SharedArrayBuffer by copying
    const copy = new ArrayBuffer(buffer.byteLength);
    new Uint8Array(copy).set(new Uint8Array(buffer));
    return copy;
  }

  onData(callback: (chunk: ArrayBuffer) => void): void {
    this.onDataCallback = callback;
  }

  onError(callback: (error: Error) => void): void {
    this.onErrorCallback = callback;
  }

  stop(): void {
    this.stopped = true;
    this.processor.disconnect();
    this.source.disconnect();
    this.audioContext.close().catch(() => {});
    this.mediaStream.getTracks().forEach((track) => track.stop());
  }
}

/**
 * Browser audio capture adapter
 */
class BrowserAudioCaptureAdapter implements AudioCaptureAdapter {
  isSupported(): boolean {
    return (
      typeof navigator !== 'undefined' &&
      typeof navigator.mediaDevices !== 'undefined' &&
      typeof navigator.mediaDevices.getUserMedia === 'function'
    );
  }

  async captureFromMicrophone(options: MicrophoneOptions): Promise<AudioStream> {
    if (!this.isSupported()) {
      throw new UnsupportedError('Microphone capture', 'browser');
    }

    try {
      const constraints: MediaStreamConstraints = {
        audio: {
          deviceId: options.deviceId ? { exact: options.deviceId } : undefined,
          echoCancellation: options.echoCancellation ?? true,
          noiseSuppression: options.noiseSuppression ?? true,
          autoGainControl: options.autoGainControl ?? true,
          sampleRate: options.sampleRate ?? 16000,
        },
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      return new BrowserAudioStream(mediaStream, options.sampleRate ?? 16000);
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          throw new AudioError('Microphone permission denied', false, error);
        }
        if (error.name === 'SecurityError') {
          throw new AudioError(
            'Microphone access requires a secure context (HTTPS or a trusted app origin)',
            false,
            error
          );
        }
        if (error.name === 'NotFoundError') {
          throw new AudioError('No microphone found', false, error);
        }
        throw new AudioError(`Failed to capture microphone: ${error.message}`, false, error);
      }
      throw new AudioError('Failed to capture microphone', false);
    }
  }
}

/**
 * Browser file adapter
 */
class BrowserFileAdapter implements FileAdapter {
  async readFile(path: string): Promise<ArrayBuffer> {
    // In browser, "path" is typically a URL or blob URL
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
    }
    return response.arrayBuffer();
  }

  async *createReadStream(path: string): AsyncIterable<ArrayBuffer> {
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
    try {
      const response = await fetch(path, { method: 'HEAD' });
      return response.ok;
    } catch {
      return false;
    }
  }
}

/**
 * Browser runtime adapter
 */
export class BrowserAdapter implements RuntimeAdapter {
  readonly type: RuntimeType = 'browser';
  readonly websocket: WebSocketAdapter = new BrowserWebSocketAdapter();
  readonly audio: AudioCaptureAdapter = new BrowserAudioCaptureAdapter();
  readonly file: FileAdapter = new BrowserFileAdapter();
}
