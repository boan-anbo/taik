/**
 * Audio source abstraction types
 */

/** Audio chunk with metadata */
export interface AudioChunk {
  /** Raw audio data */
  data: ArrayBuffer;

  /** Timestamp when this chunk was captured (ms since session start) */
  timestamp: number;

  /** Duration of this chunk in milliseconds */
  durationMs: number;
}

/** Audio source configuration */
export interface AudioSourceConfig {
  /** Sample rate in Hz */
  sampleRate: number;

  /** Number of channels */
  channels: 1 | 2;

  /** Audio format */
  format: 'pcm_s16le' | 'pcm_f32le' | 'opus' | 'flac' | 'wav' | 'mp3' | 'auto';
}

/** Audio source state */
export type AudioSourceState = 'idle' | 'starting' | 'active' | 'stopping' | 'stopped' | 'error';

/**
 * Audio source interface - abstraction for different audio inputs
 * Implementations: MicrophoneSource, FileSource, BufferSource
 */
export interface AudioSource {
  /** Start producing audio chunks */
  start(): Promise<void>;

  /** Stop producing audio chunks */
  stop(): Promise<void>;

  /** Subscribe to audio chunks */
  onChunk(callback: (chunk: AudioChunk) => void): void;

  /** Subscribe to errors */
  onError(callback: (error: Error) => void): void;

  /** Subscribe to state changes */
  onStateChange(callback: (state: AudioSourceState) => void): void;

  /** Get audio configuration */
  getConfig(): AudioSourceConfig;

  /** Get current state */
  getState(): AudioSourceState;

  /** Check if source is currently active */
  isActive(): boolean;

  /** Clean up resources */
  dispose(): void;
}

/**
 * Audio processor interface - transforms audio data
 * Implementations: Resampler, FormatConverter, Chunker
 */
export interface AudioProcessor {
  /** Process audio data */
  process(input: ArrayBuffer): Promise<ArrayBuffer>;

  /** Flush any buffered data (call at end of stream) */
  flush(): Promise<ArrayBuffer | null>;

  /** Reset processor state */
  reset(): void;
}

/** Microphone capture options */
export interface MicrophoneOptions {
  /** Specific device ID to use */
  deviceId?: string;

  /** Enable echo cancellation (default: true) */
  echoCancellation?: boolean;

  /** Enable noise suppression (default: true) */
  noiseSuppression?: boolean;

  /** Enable automatic gain control (default: true) */
  autoGainControl?: boolean;

  /** Target sample rate (default: 16000) */
  sampleRate?: number;
}

/** File source options */
export interface FileSourceOptions {
  /** File path or URL */
  path: string;

  /** Simulate real-time streaming (default: false for fast processing) */
  simulateRealtime?: boolean;

  /** Chunk duration in ms when simulating real-time (default: 100) */
  chunkDurationMs?: number;
}

/** Buffer source options */
export interface BufferSourceOptions {
  /** Raw audio buffer */
  buffer: ArrayBuffer;

  /** Audio format of the buffer */
  format: AudioSourceConfig['format'];

  /** Sample rate of the buffer */
  sampleRate: number;

  /** Number of channels */
  channels?: 1 | 2;

  /** Simulate real-time streaming (default: false) */
  simulateRealtime?: boolean;

  /** Chunk duration in ms when simulating real-time (default: 100) */
  chunkDurationMs?: number;
}
