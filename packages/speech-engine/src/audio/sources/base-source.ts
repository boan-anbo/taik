/**
 * Base audio source implementation
 * Provides common functionality for all audio sources
 */

import type {
  AudioSource,
  AudioChunk,
  AudioSourceConfig,
  AudioSourceState,
} from '../../types/audio.js';

type ChunkCallback = (chunk: AudioChunk) => void;
type ErrorCallback = (error: Error) => void;
type StateCallback = (state: AudioSourceState) => void;

/**
 * Abstract base class for audio sources
 */
export abstract class BaseAudioSource implements AudioSource {
  protected state: AudioSourceState = 'idle';
  protected config: AudioSourceConfig;
  protected chunkCallbacks: Set<ChunkCallback> = new Set();
  protected errorCallbacks: Set<ErrorCallback> = new Set();
  protected stateCallbacks: Set<StateCallback> = new Set();
  protected startTime: number = 0;

  constructor(config: AudioSourceConfig) {
    this.config = config;
  }

  /** Start producing audio chunks - implemented by subclasses */
  abstract start(): Promise<void>;

  /** Stop producing audio chunks - implemented by subclasses */
  abstract stop(): Promise<void>;

  /** Clean up resources - implemented by subclasses */
  abstract dispose(): void;

  /** Subscribe to audio chunks */
  onChunk(callback: ChunkCallback): void {
    this.chunkCallbacks.add(callback);
  }

  /** Subscribe to errors */
  onError(callback: ErrorCallback): void {
    this.errorCallbacks.add(callback);
  }

  /** Subscribe to state changes */
  onStateChange(callback: StateCallback): void {
    this.stateCallbacks.add(callback);
  }

  /** Get audio configuration */
  getConfig(): AudioSourceConfig {
    return this.config;
  }

  /** Get current state */
  getState(): AudioSourceState {
    return this.state;
  }

  /** Check if source is currently active */
  isActive(): boolean {
    return this.state === 'active';
  }

  /** Emit a chunk to all listeners */
  protected emitChunk(chunk: AudioChunk): void {
    for (const callback of this.chunkCallbacks) {
      try {
        callback(chunk);
      } catch (error) {
        console.error('Error in chunk callback:', error);
      }
    }
  }

  /** Emit an error to all listeners */
  protected emitError(error: Error): void {
    for (const callback of this.errorCallbacks) {
      try {
        callback(error);
      } catch (err) {
        console.error('Error in error callback:', err);
      }
    }
  }

  /** Update state and notify listeners */
  protected setState(newState: AudioSourceState): void {
    if (this.state === newState) return;

    this.state = newState;
    for (const callback of this.stateCallbacks) {
      try {
        callback(newState);
      } catch (error) {
        console.error('Error in state callback:', error);
      }
    }
  }

  /** Get elapsed time since start */
  protected getElapsedMs(): number {
    return Date.now() - this.startTime;
  }
}
