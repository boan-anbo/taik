/**
 * Provider-agnostic Speech Engine Types
 *
 * These types define the contract that all STT providers must implement.
 * The goal is to allow swapping providers without application code changes.
 */

// ============================================================================
// Core Event Types
// ============================================================================

/**
 * Event types emitted by speech providers
 */
export type SpeechEventType = 'partial' | 'final' | 'error' | 'status';

/**
 * Word/token timing information
 */
export interface WordTiming {
  /** The word text */
  word: string;

  /** Start time in milliseconds from audio start */
  startMs: number;

  /** End time in milliseconds from audio start */
  endMs: number;

  /** Confidence score 0.0-1.0 */
  confidence?: number;

  /** Speaker ID if diarization enabled */
  speaker?: string;
}

/**
 * Timings object for transcript events
 */
export interface TranscriptTimings {
  /** Individual word timings */
  words?: WordTiming[];

  /** Audio duration processed so far (ms) */
  audioDurationMs?: number;

  /** Latency from audio to transcript (ms) */
  latencyMs?: number;
}

/**
 * Base speech event structure
 */
export interface SpeechEvent {
  /** Event type */
  type: SpeechEventType;

  /** Transcribed text */
  text: string;

  /** Overall confidence score 0.0-1.0 */
  confidence?: number;

  /** Timing information */
  timings?: TranscriptTimings;

  /** Status message for status events */
  status?: string;

  /** Provider-specific metadata (for debugging/advanced use) */
  providerMeta?: Record<string, unknown>;
}

/**
 * Partial transcript event (interim, may change)
 */
export interface PartialSpeechEvent extends SpeechEvent {
  type: 'partial';
}

/**
 * Final transcript event (stable, won't change)
 */
export interface FinalSpeechEvent extends SpeechEvent {
  type: 'final';

  /** Detected language code */
  language?: string;

  /** Translated text if translation enabled */
  translatedText?: string;
}

/**
 * Status event (connection state, processing status)
 */
export interface StatusSpeechEvent extends SpeechEvent {
  type: 'status';

  /** Status code */
  status: SpeechStatus;
}

/**
 * Error event
 */
export interface ErrorSpeechEvent extends SpeechEvent {
  type: 'error';

  /** Normalized error category */
  category: SpeechErrorCategory;

  /** Error details */
  error: Error;

  /** Whether the error is recoverable */
  recoverable: boolean;
}

// ============================================================================
// Error Categories
// ============================================================================

/**
 * Normalized error categories across all providers
 */
export type SpeechErrorCategory =
  | 'auth' // Authentication/authorization failures
  | 'network' // Network connectivity issues
  | 'quota' // Rate limiting, quota exceeded
  | 'unsupported' // Unsupported feature/format
  | 'internal'; // Provider internal errors

/**
 * Provider-specific error with normalized category
 */
export class SpeechEngineError extends Error {
  public readonly category: SpeechErrorCategory;
  public readonly recoverable: boolean;
  public readonly providerCode?: string;
  public override readonly cause?: Error;

  constructor(
    message: string,
    category: SpeechErrorCategory,
    recoverable: boolean = false,
    providerCode?: string,
    cause?: Error
  ) {
    super(message);
    this.name = 'SpeechEngineError';
    this.category = category;
    this.recoverable = recoverable;
    this.providerCode = providerCode;
    this.cause = cause;
  }
}

// ============================================================================
// Status Types
// ============================================================================

/**
 * Connection/processing status codes
 */
export type SpeechStatus =
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'reconnecting'
  | 'processing'
  | 'idle'
  | 'finalizing';

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Audio input configuration
 */
export interface AudioInputConfig {
  /** Sample rate in Hz (default: 16000) */
  sampleRate?: number;

  /** Number of channels (default: 1 mono) */
  channels?: 1 | 2;

  /** Encoding format */
  encoding?: 'pcm_s16le' | 'pcm_f32le' | 'opus' | 'auto';
}

/**
 * Speech recognition features
 */
export interface SpeechFeatures {
  /** Enable interim/partial results */
  interimResults?: boolean;

  /** Enable speaker diarization */
  speakerDiarization?: boolean;

  /** Enable automatic punctuation */
  punctuation?: boolean;

  /** Language hints (BCP-47 codes) */
  languageHints?: string[];

  /** Enable automatic language detection */
  languageDetection?: boolean;

  /** Custom vocabulary/terms */
  customVocabulary?: string[];

  /** Enable translation */
  translation?: {
    targetLanguage: string;
  };
}

/**
 * Provider connection configuration
 */
export interface ProviderConnectionConfig {
  /** Enable automatic reconnection */
  autoReconnect?: boolean;

  /** Maximum reconnection attempts */
  maxReconnectAttempts?: number;

  /** Initial reconnection delay (ms) */
  reconnectDelayMs?: number;

  /** Connection timeout (ms) */
  connectionTimeoutMs?: number;
}

/**
 * Full provider configuration
 */
export interface SpeechProviderConfig {
  /** Audio input settings */
  audio?: AudioInputConfig;

  /** Recognition features */
  features?: SpeechFeatures;

  /** Connection settings */
  connection?: ProviderConnectionConfig;
}

// ============================================================================
// Provider Interface
// ============================================================================

/**
 * Event handler type for speech events
 */
export type SpeechEventHandler = (event: SpeechEvent) => void;

/**
 * Subscription handle returned by subscribe()
 */
export interface SpeechSubscription {
  /** Unsubscribe from events */
  unsubscribe: () => void;
}

/**
 * Provider session state
 */
export type ProviderSessionState =
  | 'idle'
  | 'starting'
  | 'active'
  | 'stopping'
  | 'stopped'
  | 'error';

/**
 * Speech Provider Interface
 *
 * All STT provider implementations must implement this interface.
 * This ensures consistent behavior across providers (Soniox, Whisper, etc.)
 */
export interface SpeechProvider {
  /** Provider identifier (e.g., 'soniox', 'whisper', 'deepgram') */
  readonly id: string;

  /** Provider display name */
  readonly name: string;

  /** Current session state */
  readonly state: ProviderSessionState;

  /**
   * Start a transcription session
   * @param config Session configuration (overrides defaults)
   */
  start(config?: SpeechProviderConfig): Promise<void>;

  /**
   * Stop the transcription session
   * Waits for final results before resolving
   */
  stop(): Promise<void>;

  /**
   * Abort the session immediately without waiting
   */
  abort(): void;

  /**
   * Send audio data to the provider
   * @param data PCM audio data as ArrayBuffer
   */
  sendAudio(data: ArrayBuffer): void;

  /**
   * Subscribe to speech events
   * @param handler Event handler function
   * @returns Subscription handle for unsubscribing
   */
  subscribe(handler: SpeechEventHandler): SpeechSubscription;

  /**
   * Dispose of all resources
   */
  dispose(): void;
}

/**
 * Factory function type for creating providers
 */
export type SpeechProviderFactory = (
  credentials: Record<string, string>,
  config?: SpeechProviderConfig
) => SpeechProvider;

// ============================================================================
// Provider Registry Types
// ============================================================================

/**
 * Provider metadata for registry
 */
export interface ProviderInfo {
  /** Provider ID */
  id: string;

  /** Display name */
  name: string;

  /** Provider description */
  description: string;

  /** Supported features */
  supportedFeatures: (keyof SpeechFeatures)[];

  /** Required credentials keys */
  requiredCredentials: string[];

  /** Factory function */
  factory: SpeechProviderFactory;
}
