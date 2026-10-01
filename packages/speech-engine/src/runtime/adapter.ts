/**
 * Runtime adapter interfaces
 * Abstracts platform-specific APIs for universal runtime support
 */

import type { MicrophoneOptions } from '../types/audio.js';

/**
 * Detected runtime environment
 */
export type RuntimeType = 'browser' | 'node' | 'bun' | 'cloudflare' | 'deno' | 'react-native' | 'unknown';

/**
 * WebSocket connection interface (unified across runtimes)
 */
export interface WebSocketConnection {
  /** Register callback for connection open */
  onOpen(callback: () => void): void;

  /** Register callback for incoming messages */
  onMessage(callback: (data: ArrayBuffer | string) => void): void;

  /** Register callback for errors */
  onError(callback: (error: Error) => void): void;

  /** Register callback for connection close */
  onClose(callback: (code: number, reason: string) => void): void;

  /** Send data (binary or text) */
  send(data: ArrayBuffer | string): void;

  /** Close the connection */
  close(code?: number, reason?: string): void;

  /** Get current ready state */
  getReadyState(): 'connecting' | 'open' | 'closing' | 'closed';
}

/**
 * WebSocket adapter interface
 */
export interface WebSocketAdapter {
  /** Create a new WebSocket connection */
  create(url: string, protocols?: string[]): WebSocketConnection;
}

/**
 * Audio stream from microphone
 */
export interface AudioStream {
  /** Register callback for audio data */
  onData(callback: (chunk: ArrayBuffer) => void): void;

  /** Register callback for errors */
  onError(callback: (error: Error) => void): void;

  /** Stop the audio stream */
  stop(): void;
}

/**
 * Audio capture adapter interface
 */
export interface AudioCaptureAdapter {
  /** Check if microphone capture is supported */
  isSupported(): boolean;

  /** Capture audio from microphone */
  captureFromMicrophone(options: MicrophoneOptions): Promise<AudioStream>;
}

/**
 * File reading adapter interface
 */
export interface FileAdapter {
  /** Read entire file as ArrayBuffer */
  readFile(path: string): Promise<ArrayBuffer>;

  /** Create a readable stream from file */
  createReadStream(path: string): AsyncIterable<ArrayBuffer>;

  /** Check if file exists */
  exists(path: string): Promise<boolean>;
}

/**
 * Combined runtime adapter
 */
export interface RuntimeAdapter {
  /** Runtime type identifier */
  readonly type: RuntimeType;

  /** WebSocket operations */
  readonly websocket: WebSocketAdapter;

  /** Audio capture operations */
  readonly audio: AudioCaptureAdapter;

  /** File operations */
  readonly file: FileAdapter;
}
