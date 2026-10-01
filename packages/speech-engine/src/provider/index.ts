/**
 * Speech Engine Provider Module
 *
 * Provider-agnostic speech-to-text interface.
 * Import providers from here to use the abstracted API.
 */

// Core types
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

  // Errors
  SpeechErrorCategory,

  // Status
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
} from './types.js';

export { SpeechEngineError } from './types.js';

// Registry
export {
  providerRegistry,
  registerProvider,
  createProvider,
} from './registry.js';

// Soniox provider
export { SonioxProvider, sonioxProviderInfo } from './soniox-provider.js';

// Apple Speech provider (iOS only)
export {
  AppleSpeechProvider,
  setAppleSpeechNativeModule,
  isAppleSpeechAvailable,
  createAppleSpeechProvider,
} from './apple-speech-provider.js';

// Whisper provider (local, offline)
export {
  WhisperProvider,
  setWhisperNativeModule,
  isWhisperAvailable,
  downloadWhisperModel,
  createWhisperProvider,
} from './whisper-provider.js';

/**
 * Initialize default providers
 * Call this at app startup to register built-in providers
 */
export function initializeProviders(): void {
  const { providerRegistry } = require('./registry.js');
  const { sonioxProviderInfo } = require('./soniox-provider.js');

  if (!providerRegistry.has('soniox')) {
    providerRegistry.register(sonioxProviderInfo);
  }
}
