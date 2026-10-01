/**
 * @taik/speech-engine - Provider-Agnostic Speech-to-Text Engine
 *
 * A TypeScript library for real-time and file-based speech-to-text
 * with a provider-agnostic interface. Supports multiple STT backends
 * (Soniox, etc.) and works in browser, Node.js, React Native, and edge runtimes.
 *
 * @example Using the provider-agnostic API
 * ```typescript
 * import { createProvider, initializeProviders } from '@taik/speech-engine/provider';
 *
 * initializeProviders();
 *
 * const provider = createProvider('soniox', { apiKey: 'your-key' });
 *
 * provider.subscribe((event) => {
 *   if (event.type === 'final') {
 *     console.log(event.text);
 *   }
 * });
 *
 * await provider.start();
 * ```
 *
 * @example Using the legacy Soniox API (backward compatible)
 * ```typescript
 * import { SonioxSession } from '@taik/speech-engine';
 *
 * const session = new SonioxSession({
 *   apiKey: 'your-api-key',
 *   features: {
 *     enableSpeakerDiarization: true,
 *   },
 * });
 *
 * session.on('transcript', (result) => {
 *   console.log(result.text);
 * });
 *
 * await session.startMicrophone();
 * ```
 */

// ============================================================================
// Core Session API
// ============================================================================

export {
  SonioxSession,
  FileSession,
  transcribeFile,
  transcribeBuffer,
} from './core/index.js';

export type {
  SessionState,
  FileTranscriptionResult,
} from './core/index.js';

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
  MediaStreamSource,
} from './audio/index.js';

export type { MediaStreamSourceOptions } from './audio/index.js';

// ============================================================================
// Runtime Detection
// ============================================================================

export {
  detectRuntime,
  getRuntimeAdapter,
  setNativeAudioModule,
} from './runtime/index.js';

export type {
  RuntimeType,
  RuntimeAdapter,
  NativeAudioCaptureModule,
} from './runtime/index.js';

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

// ============================================================================
// Provider API (new abstraction layer)
// ============================================================================

export {
  // Registry
  providerRegistry,
  registerProvider,
  createProvider,
  initializeProviders,

  // Soniox provider
  SonioxProvider,
  sonioxProviderInfo,

  // Error class
  SpeechEngineError,
} from './provider/index.js';

export type {
  // Events
  SpeechEventType,
  SpeechEvent,
  PartialSpeechEvent,
  FinalSpeechEvent,
  StatusSpeechEvent,
  ErrorSpeechEvent,
  WordTiming,
  TranscriptTimings,
  SpeechErrorCategory,
  SpeechStatus,

  // Config
  AudioInputConfig,
  SpeechFeatures,
  ProviderConnectionConfig,
  SpeechProviderConfig,

  // Provider interface
  SpeechProvider,
  SpeechEventHandler,
  SpeechSubscription,
  ProviderSessionState,
  SpeechProviderFactory,
  ProviderInfo,
} from './provider/index.js';
