/**
 * Type exports
 */

export type {
  SonioxConfig,
  AudioConfig,
  TranscriptionFeatures,
  TranscriptionContext,
  TranslationConfig,
  ReconnectionConfig,
  LoggingConfig,
  Logger,
} from './config.js';

export { DEFAULT_CONFIG } from './config.js';

export type {
  TranscriptWord,
  TranscriptResult,
  ConnectionState,
  ErrorPhase,
  SessionEventMap,
  SessionEventListener,
  TypedEventEmitter,
} from './events.js';

export type {
  ProtocolConfigMessage,
  ProtocolKeepaliveMessage,
  ProtocolFinalizeMessage,
  ClientMessage,
  ProtocolToken,
  ProtocolTranscriptMessage,
  ServerMessage,
} from './protocol.js';

export {
  isFinishedMessage,
  isErrorMessage,
  buildConfigMessage,
} from './protocol.js';

export type {
  AudioChunk,
  AudioSourceConfig,
  AudioSourceState,
  AudioSource,
  AudioProcessor,
  MicrophoneOptions,
  FileSourceOptions,
  BufferSourceOptions,
} from './audio.js';
