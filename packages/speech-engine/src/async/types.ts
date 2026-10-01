/**
 * Soniox Async Transcription API Types
 *
 * Types for the async file transcription REST API.
 */

// ============================================================================
// Request Types
// ============================================================================

/**
 * Options for creating a transcription job
 */
export interface CreateTranscriptionOptions {
  /** Speech-to-text model to use (default: stt-async-preview) */
  model?: string;

  /** URL of the audio file to transcribe (mutually exclusive with fileId) */
  audioUrl?: string;

  /** ID of uploaded file to transcribe (mutually exclusive with audioUrl) */
  fileId?: string;

  /** Expected languages in the audio (e.g., ['en', 'zh']) */
  languageHints?: string[];

  /** Enable speaker diarization */
  enableSpeakerDiarization?: boolean;

  /** Enable language identification */
  enableLanguageIdentification?: boolean;

  /** Additional context to improve transcription accuracy */
  context?: string;

  /** Client-defined tracking identifier */
  clientReferenceId?: string;

  /** Webhook URL for completion notifications */
  webhookUrl?: string;
}

// ============================================================================
// Response Types
// ============================================================================

/**
 * File upload response
 * Note: Soniox API returns 'id' and 'filename' (snake_case)
 */
export interface FileUploadResponse {
  /** File ID (UUID) */
  id: string;
  /** Original filename */
  filename: string;
  /** File size in bytes */
  size?: number;
  /** Upload timestamp (ISO 8601) */
  createdAt?: string;
  /** Client reference ID if provided */
  clientReferenceId?: string;
}

/**
 * Transcription status
 */
export type TranscriptionStatus = 'queued' | 'processing' | 'completed' | 'error';

/**
 * Transcription job response
 */
export interface Transcription {
  id: string;
  status: TranscriptionStatus;
  createdAt: string;
  model: string;
  audioUrl?: string;
  fileId?: string;
  filename: string;
  languageHints?: string[];
  enableSpeakerDiarization: boolean;
  enableLanguageIdentification: boolean;
  audioDurationMs?: number;
  errorType?: string;
  errorMessage?: string;
  clientReferenceId?: string;
}

/**
 * Token in transcript result
 */
export interface TranscriptToken {
  text: string;
  startMs: number;
  endMs: number;
  confidence: number;
  speaker?: string;
}

/**
 * Transcript result (returned when transcription is complete)
 */
export interface TranscriptResult {
  id: string;
  text: string;
  tokens: TranscriptToken[];
}

/**
 * Async transcription result (combines status and transcript)
 */
export interface AsyncTranscriptionResult {
  /** Transcription ID */
  id: string;

  /** Complete transcribed text */
  text: string;

  /** Individual tokens with timing */
  tokens: TranscriptToken[];

  /** Audio duration in milliseconds */
  audioDurationMs: number;

  /** Model used for transcription */
  model: string;

  /** Original filename */
  filename: string;
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Soniox API error response
 */
export interface SonioxApiError {
  statusCode: number;
  errorType: string;
  message: string;
  validationErrors: Array<{
    errorType: string;
    location: string;
    message: string;
  }>;
  requestId: string;
}

/**
 * Async transcription error
 */
export class AsyncTranscriptionError extends Error {
  public readonly errorType: string;
  public readonly statusCode: number;
  public readonly requestId?: string;

  constructor(
    message: string,
    errorType: string,
    statusCode: number,
    requestId?: string
  ) {
    super(message);
    this.name = 'AsyncTranscriptionError';
    this.errorType = errorType;
    this.statusCode = statusCode;
    this.requestId = requestId;
  }
}

// ============================================================================
// Progress Types
// ============================================================================

/**
 * Progress event for async transcription
 */
export interface AsyncTranscriptionProgress {
  /** Current status */
  status: TranscriptionStatus;

  /** Progress percentage (0-100), estimated based on polling */
  progress: number;

  /** Transcription ID */
  transcriptionId: string;

  /** Error message if status is 'error' */
  errorMessage?: string;
}

/**
 * Progress callback type
 */
export type ProgressCallback = (progress: AsyncTranscriptionProgress) => void;

// ============================================================================
// Client Configuration
// ============================================================================

/**
 * Async client configuration
 */
export interface AsyncClientConfig {
  /** Soniox API key */
  apiKey: string;

  /** API base URL (default: https://api.soniox.com/v1) */
  baseUrl?: string;

  /** Default model for transcriptions */
  defaultModel?: string;

  /** Polling interval in ms when waiting for completion (default: 2000) */
  pollingIntervalMs?: number;

  /** Maximum polling duration in ms (default: 3600000 = 1 hour) */
  maxPollingDurationMs?: number;
}

export const DEFAULT_ASYNC_CONFIG = {
  baseUrl: 'https://api.soniox.com/v1',
  defaultModel: 'stt-async-preview',
  pollingIntervalMs: 2000,
  maxPollingDurationMs: 3600000, // 1 hour
} as const;
