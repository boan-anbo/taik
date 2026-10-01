/**
 * Soniox-specific configuration
 * Maps directly to Soniox WebSocket API capabilities
 */
export interface SonioxConfig {
  /** Soniox API key for authentication */
  apiKey: string;

  /** WebSocket endpoint (default: wss://stt-rt.soniox.com/transcribe-websocket) */
  endpoint?: string;

  /** Model to use (default: stt-rt-preview) */
  model?: string;

  /**
   * How long to wait after sending `finalize` before completing the session.
   * Soniox sometimes doesn't emit a `finished` message; we use this as a safety cap.
   *
   * Note: When the user stops while there is still a pending (non-final) utterance,
   * Taik will wait a bit longer by default (up to ~2s) to allow Soniox to finalize it.
   */
  finalizeTimeoutMs?: number;

  /**
   * Minimum time to wait after sending `finalize` before concluding the session
   * based on a quiet period. This reduces the chance of dropping the last
   * in-progress (non-final) utterance when the user stops mid-sentence.
   *
   * Note: When the user stops while there is still a pending (non-final) utterance,
   * Taik will wait a bit longer by default to allow Soniox to finalize it.
   */
  finalizeMinWaitMs?: number;

  /** Audio format configuration */
  audio?: AudioConfig;

  /** Transcription features */
  features?: TranscriptionFeatures;

  /** Reconnection behavior */
  reconnection?: ReconnectionConfig;

  /** Logging configuration */
  logging?: LoggingConfig;
}

export interface AudioConfig {
  /** Audio format: 'auto' for automatic detection, or specify raw format */
  format?: 'auto' | 'pcm_s16le' | 'pcm_f32le' | 'opus' | 'flac' | 'mp3' | 'wav';

  /** Sample rate in Hz (required for raw formats, default: 16000) */
  sampleRate?: number;

  /** Number of channels (default: 1) */
  channels?: 1 | 2;
}

export interface TranscriptionFeatures {
  /** Language hints for recognition (e.g., ['en', 'es']) */
  languageHints?: string[];

  /** Enable automatic language identification */
  enableLanguageIdentification?: boolean;

  /** Enable speaker diarization */
  enableSpeakerDiarization?: boolean;

  /** Enable endpoint detection (auto-detect speech boundaries) */
  enableEndpointDetection?: boolean;

  /** Context for improved accuracy */
  context?: TranscriptionContext;

  /** Translation configuration */
  translation?: TranslationConfig;
}

export interface TranscriptionContext {
  /** General key-value context (e.g., domain: 'medical') */
  general?: Array<{ key: string; value: string }>;

  /** Free-form text context */
  text?: string;

  /** Specific terms to recognize */
  terms?: string[];

  /** Translation term mappings */
  translationTerms?: Array<{ source: string; target: string }>;
}

export interface TranslationConfig {
  /** Translation type */
  type: 'one_way' | 'two_way';

  /** Target language for one-way translation */
  targetLanguage?: string;

  /** First language for two-way translation */
  languageA?: string;

  /** Second language for two-way translation */
  languageB?: string;
}

export interface ReconnectionConfig {
  /** Enable automatic reconnection (default: true) */
  enabled?: boolean;

  /** Maximum reconnection attempts (default: 5) */
  maxAttempts?: number;

  /** Initial delay in ms (default: 1000) */
  initialDelayMs?: number;

  /** Maximum delay in ms (default: 30000) */
  maxDelayMs?: number;

  /** Backoff multiplier (default: 2) */
  backoffMultiplier?: number;
}

export interface LoggingConfig {
  /** Log level */
  level?: 'debug' | 'info' | 'warn' | 'error' | 'silent';

  /** Custom logger implementation */
  logger?: Logger;
}

export interface Logger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

/** Default configuration values */
export const DEFAULT_CONFIG = {
  endpoint: 'wss://stt-rt.soniox.com/transcribe-websocket',
  model: 'stt-rt-preview',
  audio: {
    format: 'auto' as const,
    sampleRate: 16000,
    channels: 1 as const,
  },
  reconnection: {
    enabled: true,
    maxAttempts: 5,
    initialDelayMs: 1000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
  },
  logging: {
    level: 'warn' as const,
  },
} as const;
