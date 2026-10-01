/**
 * Audio Capture Expo Module
 * TypeScript interface for the native iOS audio capture module
 */

import { NativeModulesProxy, EventEmitter } from 'expo-modules-core';

// Import native module
const AudioCaptureModule = NativeModulesProxy.AudioCapture as AudioCaptureModuleType;

// Create typed event emitter - cast to any to work around expo-modules-core type changes
const emitter = new (EventEmitter as any)(AudioCaptureModule) as {
  addListener<T>(eventName: string, listener: (event: T) => void): { remove: () => void };
};

/** Audio capture options */
export interface AudioCaptureOptions {
  /** Sample rate in Hz (default: 16000) */
  sampleRate?: number;
  /** Number of channels (default: 1) */
  channels?: number;
  /** Enable echo cancellation (default: true) */
  echoCancellation?: boolean;
  /** Enable noise suppression (default: true) */
  noiseSuppression?: boolean;
  /** Enable auto gain control (default: true) */
  autoGainControl?: boolean;
}

/** Audio chunk event payload */
export interface AudioChunkEvent {
  /** Session ID */
  sessionId: string;
  /** Base64-encoded PCM audio data */
  data: string;
  /** Timestamp in milliseconds */
  timestamp: number;
}

/** Audio error event payload */
export interface AudioErrorEvent {
  /** Session ID */
  sessionId: string;
  /** Error message */
  error: string;
}

/** State change event payload */
export interface AudioStateChangeEvent {
  /** Session ID */
  sessionId: string;
  /** New state */
  state: 'starting' | 'active' | 'stopping' | 'stopped' | 'error';
}

/** Native module type */
interface AudioCaptureModuleType {
  startCapture(options: AudioCaptureOptions): Promise<string>;
  stopCapture(sessionId: string): Promise<void>;
}

/**
 * Start audio capture
 * @param options Capture options
 * @returns Promise resolving to session ID
 */
export async function startCapture(options: AudioCaptureOptions = {}): Promise<string> {
  return AudioCaptureModule.startCapture({
    sampleRate: options.sampleRate ?? 16000,
    channels: options.channels ?? 1,
    echoCancellation: options.echoCancellation ?? true,
    noiseSuppression: options.noiseSuppression ?? true,
    autoGainControl: options.autoGainControl ?? true,
  });
}

/**
 * Stop audio capture
 * @param sessionId Session ID from startCapture
 */
export async function stopCapture(sessionId: string): Promise<void> {
  return AudioCaptureModule.stopCapture(sessionId);
}

/**
 * Subscribe to audio chunks
 * @param listener Callback for audio chunks
 * @returns Subscription object with remove() method
 */
export function addAudioChunkListener(
  listener: (event: AudioChunkEvent) => void
): { remove: () => void } {
  return emitter.addListener('onAudioChunk', listener);
}

/**
 * Subscribe to audio errors
 * @param listener Callback for errors
 * @returns Subscription object with remove() method
 */
export function addAudioErrorListener(
  listener: (event: AudioErrorEvent) => void
): { remove: () => void } {
  return emitter.addListener('onAudioError', listener);
}

/**
 * Subscribe to state changes
 * @param listener Callback for state changes
 * @returns Subscription object with remove() method
 */
export function addStateChangeListener(
  listener: (event: AudioStateChangeEvent) => void
): { remove: () => void } {
  return emitter.addListener('onAudioStateChange', listener);
}

export default {
  startCapture,
  stopCapture,
  addAudioChunkListener,
  addAudioErrorListener,
  addStateChangeListener,
};
