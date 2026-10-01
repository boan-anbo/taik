/**
 * React Native runtime adapter
 * Provides WebSocket, audio capture (via native module), and file operations for React Native
 */

import type {
  RuntimeAdapter,
  WebSocketAdapter,
  WebSocketConnection,
  AudioCaptureAdapter,
  AudioStream,
  FileAdapter,
} from './adapter.js';
import type { MicrophoneOptions } from '../types/audio.js';
import { UnsupportedError, AudioError } from '../utils/errors.js';

/**
 * Audio capture module interface (provided by native Expo module)
 * This is injected at runtime by the React Native app
 */
export interface NativeAudioCaptureModule {
  /** Start audio capture, returns session ID */
  startCapture(options: {
    sampleRate: number;
    channels: number;
    echoCancellation: boolean;
    noiseSuppression: boolean;
    autoGainControl: boolean;
  }): Promise<string>;

  /** Stop audio capture for a session */
  stopCapture(sessionId: string): Promise<void>;

  /** Add listener for audio chunks (returns subscription) */
  addListener(
    eventName: 'onAudioChunk',
    callback: (event: { sessionId: string; data: string; timestamp: number }) => void
  ): { remove: () => void };

  /** Add listener for errors */
  addListener(
    eventName: 'onAudioError',
    callback: (event: { sessionId: string; error: string }) => void
  ): { remove: () => void };
}

// Reference to native module (set via setNativeAudioModule)
let nativeAudioModule: NativeAudioCaptureModule | null = null;

/**
 * Set the native audio capture module reference
 * Must be called by the React Native app before using microphone
 */
export function setNativeAudioModule(module: NativeAudioCaptureModule): void {
  nativeAudioModule = module;
}

/**
 * WebSocket connection implementation for React Native
 * Uses the built-in WebSocket API available in React Native
 */
class ReactNativeWebSocketConnection implements WebSocketConnection {
  private ws: WebSocket;
  private openCallbacks: Array<() => void> = [];
  private messageCallbacks: Array<(data: ArrayBuffer | string) => void> = [];
  private errorCallbacks: Array<(error: Error) => void> = [];
  private closeCallbacks: Array<(code: number, reason: string) => void> = [];

  constructor(url: string, protocols?: string[]) {
    this.ws = protocols ? new WebSocket(url, protocols) : new WebSocket(url);
    this.ws.binaryType = 'arraybuffer';

    this.ws.onopen = () => {
      for (const callback of this.openCallbacks) {
        callback();
      }
    };

    this.ws.onmessage = (event: MessageEvent) => {
      for (const callback of this.messageCallbacks) {
        callback(event.data);
      }
    };

    this.ws.onerror = () => {
      const error = new Error('WebSocket error');
      for (const callback of this.errorCallbacks) {
        callback(error);
      }
    };

    this.ws.onclose = (event: CloseEvent) => {
      for (const callback of this.closeCallbacks) {
        callback(event.code, event.reason || '');
      }
    };
  }

  onOpen(callback: () => void): void {
    this.openCallbacks.push(callback);
    // If already open, call immediately
    if (this.ws.readyState === WebSocket.OPEN) {
      callback();
    }
  }

  onMessage(callback: (data: ArrayBuffer | string) => void): void {
    this.messageCallbacks.push(callback);
  }

  onError(callback: (error: Error) => void): void {
    this.errorCallbacks.push(callback);
  }

  onClose(callback: (code: number, reason: string) => void): void {
    this.closeCallbacks.push(callback);
  }

  send(data: ArrayBuffer | string): void {
    if (this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not open');
    }
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
 * WebSocket adapter for React Native
 */
class ReactNativeWebSocketAdapter implements WebSocketAdapter {
  create(url: string, protocols?: string[]): WebSocketConnection {
    return new ReactNativeWebSocketConnection(url, protocols);
  }
}

/**
 * Audio stream implementation for React Native
 * Receives audio chunks from native module via events
 */
class ReactNativeAudioStream implements AudioStream {
  private sessionId: string;
  private dataCallback: ((chunk: ArrayBuffer) => void) | null = null;
  private errorCallback: ((error: Error) => void) | null = null;
  private chunkSubscription: { remove: () => void } | null = null;
  private errorSubscription: { remove: () => void } | null = null;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
    this.setupListeners();
  }

  private setupListeners(): void {
    if (!nativeAudioModule) {
      return;
    }

    // Listen for audio chunks
    this.chunkSubscription = nativeAudioModule.addListener(
      'onAudioChunk',
      (event) => {
        if (event.sessionId === this.sessionId && this.dataCallback) {
          // Convert base64 to ArrayBuffer
          const binaryString = atob(event.data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          this.dataCallback(bytes.buffer);
        }
      }
    );

    // Listen for errors
    this.errorSubscription = nativeAudioModule.addListener(
      'onAudioError',
      (event) => {
        if (event.sessionId === this.sessionId && this.errorCallback) {
          this.errorCallback(new AudioError(event.error));
        }
      }
    );
  }

  onData(callback: (chunk: ArrayBuffer) => void): void {
    this.dataCallback = callback;
  }

  onError(callback: (error: Error) => void): void {
    this.errorCallback = callback;
  }

  stop(): void {
    // Remove listeners
    this.chunkSubscription?.remove();
    this.errorSubscription?.remove();

    // Stop native capture
    if (nativeAudioModule) {
      nativeAudioModule.stopCapture(this.sessionId).catch((err) => {
        console.error('Error stopping audio capture:', err);
      });
    }
  }
}

/**
 * Audio capture adapter for React Native
 * Delegates to native module for actual audio capture
 */
class ReactNativeAudioCaptureAdapter implements AudioCaptureAdapter {
  isSupported(): boolean {
    return nativeAudioModule !== null;
  }

  async captureFromMicrophone(options: MicrophoneOptions): Promise<AudioStream> {
    if (!nativeAudioModule) {
      throw new UnsupportedError(
        'Microphone capture (native module not registered)',
        'react-native'
      );
    }

    try {
      const sessionId = await nativeAudioModule.startCapture({
        sampleRate: options.sampleRate ?? 16000,
        channels: 1, // Microphone is always mono for speech recognition
        echoCancellation: options.echoCancellation ?? true,
        noiseSuppression: options.noiseSuppression ?? true,
        autoGainControl: options.autoGainControl ?? true,
      });

      return new ReactNativeAudioStream(sessionId);
    } catch (error) {
      throw new AudioError(
        error instanceof Error ? error.message : 'Failed to start audio capture',
        false,
        error instanceof Error ? error : undefined
      );
    }
  }
}

/**
 * File adapter for React Native
 * Limited file operations - primarily for reading remote URLs
 */
class ReactNativeFileAdapter implements FileAdapter {
  async readFile(path: string): Promise<ArrayBuffer> {
    // Only support HTTP/HTTPS URLs in React Native
    if (path.startsWith('http://') || path.startsWith('https://')) {
      const response = await fetch(path);
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
      }
      return response.arrayBuffer();
    }

    // For local files, the React Native app needs to provide a way to read them
    // This could be done via expo-file-system or a native module
    throw new UnsupportedError(
      'Local file reading (use HTTP URLs or BufferSource)',
      'react-native'
    );
  }

  async *createReadStream(path: string): AsyncIterable<ArrayBuffer> {
    // Streaming not well supported in React Native
    // Fall back to reading entire file
    const buffer = await this.readFile(path);

    // Yield in chunks for compatibility
    const CHUNK_SIZE = 65536; // 64KB
    let offset = 0;

    while (offset < buffer.byteLength) {
      const end = Math.min(offset + CHUNK_SIZE, buffer.byteLength);
      yield buffer.slice(offset, end);
      offset = end;
    }
  }

  async exists(path: string): Promise<boolean> {
    if (path.startsWith('http://') || path.startsWith('https://')) {
      try {
        const response = await fetch(path, { method: 'HEAD' });
        return response.ok;
      } catch {
        return false;
      }
    }
    // Cannot check local file existence in React Native without native module
    return false;
  }
}

/**
 * React Native runtime adapter
 */
export class ReactNativeAdapter implements RuntimeAdapter {
  readonly type = 'react-native' as const;
  readonly websocket: WebSocketAdapter;
  readonly audio: AudioCaptureAdapter;
  readonly file: FileAdapter;

  constructor() {
    this.websocket = new ReactNativeWebSocketAdapter();
    this.audio = new ReactNativeAudioCaptureAdapter();
    this.file = new ReactNativeFileAdapter();
  }
}
