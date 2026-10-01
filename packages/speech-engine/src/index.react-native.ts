/**
 * @taik/speech-engine - React Native Entry Point
 *
 * This entry point excludes Node.js-specific adapters that use fs/promises
 * and other Node.js APIs not available in React Native.
 */

// ============================================================================
// Core Session API
// ============================================================================

export {
  SonioxSession,
  FileSession,
  transcribeFile,
  transcribeBuffer,
} from './core/index.react-native.js';

export type {
  SessionState,
  FileTranscriptionResult,
} from './core/index.react-native.js';

// ============================================================================
// Configuration Types
// ============================================================================

export type {
  SonioxConfig,
  AudioConfig,
  TranscriptionFeatures,
  TranscriptionContext,
  TranslationConfig,
  ReconnectionConfig,
  LoggingConfig,
  Logger,
} from './types/index.js';

export { DEFAULT_CONFIG } from './types/index.js';

// ============================================================================
// Event Types
// ============================================================================

export type {
  TranscriptWord,
  TranscriptResult,
  ConnectionState,
  ErrorPhase,
  SessionEventMap,
  SessionEventListener,
} from './types/index.js';

// ============================================================================
// Audio Types & Sources
// ============================================================================

export type {
  AudioSource,
  AudioChunk,
  AudioSourceConfig,
  AudioSourceState,
  AudioProcessor,
  MicrophoneOptions,
  FileSourceOptions,
  BufferSourceOptions,
} from './types/index.js';

export {
  MicrophoneSource,
  FileSource,
  BufferSource,
} from './audio/index.js';

// ============================================================================
// Runtime Detection - React Native specific
// ============================================================================

export {
  detectRuntime,
  getRuntimeAdapter,
  setNativeAudioModule,
} from './runtime/index.react-native.js';

export type {
  RuntimeType,
  RuntimeAdapter,
  NativeAudioCaptureModule,
} from './runtime/index.react-native.js';

// ============================================================================
// Errors
// ============================================================================

export {
  SonioxError,
  ConnectionError,
  AudioError,
  ConfigError,
  ProtocolError,
  UnsupportedError,
  TranscriptionError,
} from './utils/index.js';

// ============================================================================
// Async File Transcription (REST API)
// ============================================================================

export {
  // Client
  SonioxAsyncClient,

  // Session
  AsyncFileSession,
  transcribeUrlAsync,
  transcribeFileAsync,

  // Error
  AsyncTranscriptionError,

  // Constants
  DEFAULT_ASYNC_CONFIG,
} from './async/index.js';

export type {
  // Event types
  AsyncSessionEventMap,

  // Request types
  CreateTranscriptionOptions,
  AsyncClientConfig,

  // Response types
  FileUploadResponse,
  Transcription,
  TranscriptionStatus,
  TranscriptToken as AsyncTranscriptToken,
  TranscriptResult as AsyncTranscriptResult,
  AsyncTranscriptionResult,
  AsyncTranscriptionProgress,
  ProgressCallback,
  SonioxApiError,
} from './async/index.js';
