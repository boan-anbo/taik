/**
 * Soniox Async Transcription Module
 *
 * Provides async file transcription via Soniox REST API.
 */

// Client
export { SonioxAsyncClient } from './soniox-async-client.js';

// Session
export {
  AsyncFileSession,
  transcribeUrlAsync,
  transcribeFileAsync,
  type AsyncSessionEventMap,
} from './async-file-session.js';

// Types
export {
  type CreateTranscriptionOptions,
  type FileUploadResponse,
  type Transcription,
  type TranscriptionStatus,
  type TranscriptToken,
  type TranscriptResult,
  type AsyncTranscriptionResult,
  type AsyncTranscriptionProgress,
  type ProgressCallback,
  type AsyncClientConfig,
  type SonioxApiError,

  // Error class
  AsyncTranscriptionError,

  // Constants
  DEFAULT_ASYNC_CONFIG,
} from './types.js';
