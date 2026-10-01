/**
 * Typed event system for session lifecycle
 */

/** Individual word with timing and metadata */
export interface TranscriptWord {
  /** The transcribed word text */
  text: string;

  /** Start time in milliseconds */
  startMs: number;

  /** End time in milliseconds */
  endMs: number;

  /** Confidence score (0.0 - 1.0) */
  confidence: number;

  /** Speaker label (if diarization enabled) */
  speaker?: string;

  /** Language of this word (if language ID enabled) */
  language?: string;
}

/** A transcription result (partial or final) */
export interface TranscriptResult {
  /** Combined text from all tokens */
  text: string;

  /** Whether this is a finalized result */
  isFinal: boolean;

  /** Individual words/tokens with timing */
  words: TranscriptWord[];

  /** Detected language (if language ID enabled) */
  detectedLanguage?: string;

  /** Source language for translated content */
  sourceLanguage?: string;

  /** Translated text (if translation enabled) */
  translatedText?: string;

  /** Audio processed into final tokens (ms) */
  finalAudioProcMs: number;

  /** Total audio processed (ms) */
  totalAudioProcMs: number;
}

/** Connection state */
export type ConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'closed';

/** Error phases */
export type ErrorPhase = 'connection' | 'audio' | 'transcription' | 'protocol';

/** Session event map - all possible events and their payloads */
export interface SessionEventMap {
  /** Connection state changed */
  'state-change': { state: ConnectionState; previousState: ConnectionState };

  /** Successfully connected to Soniox */
  connected: void;

  /** Disconnected from Soniox */
  disconnected: { code: number; reason: string };

  /** Error occurred */
  error: { error: Error; phase: ErrorPhase; recoverable: boolean };

  /** Transcript received (partial or final) */
  transcript: TranscriptResult;

  /** Audio streaming started */
  'audio-start': void;

  /** Audio streaming ended */
  'audio-end': void;

  /** Session completed with final transcript */
  completed: { fullText: string; results: TranscriptResult[] };

  /** Attempting to reconnect */
  reconnecting: { attempt: number; maxAttempts: number; delayMs: number };

  /** Reconnection failed after all attempts */
  'reconnect-failed': { attempts: number };

  /** Keepalive sent */
  keepalive: void;
}

/** Type-safe event listener */
export type SessionEventListener<K extends keyof SessionEventMap> =
  SessionEventMap[K] extends void
    ? () => void
    : (payload: SessionEventMap[K]) => void;

/** Type-safe event emitter interface */
export interface TypedEventEmitter<TEventMap extends Record<string, unknown>> {
  on<K extends keyof TEventMap>(
    event: K,
    listener: TEventMap[K] extends void ? () => void : (payload: TEventMap[K]) => void
  ): this;

  off<K extends keyof TEventMap>(
    event: K,
    listener: TEventMap[K] extends void ? () => void : (payload: TEventMap[K]) => void
  ): this;

  once<K extends keyof TEventMap>(
    event: K,
    listener: TEventMap[K] extends void ? () => void : (payload: TEventMap[K]) => void
  ): this;

  emit<K extends keyof TEventMap>(
    event: K,
    ...args: TEventMap[K] extends void ? [] : [payload: TEventMap[K]]
  ): boolean;

  removeAllListeners<K extends keyof TEventMap>(event?: K): this;
}
