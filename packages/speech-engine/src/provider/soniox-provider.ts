/**
 * Soniox Provider Adapter
 *
 * Wraps the Soniox-specific implementation behind the provider-agnostic interface.
 */

import type {
  SpeechProvider,
  SpeechProviderConfig,
  SpeechEventHandler,
  SpeechSubscription,
  SpeechEvent,
  PartialSpeechEvent,
  FinalSpeechEvent,
  StatusSpeechEvent,
  ErrorSpeechEvent,
  ProviderSessionState,
  SpeechErrorCategory,
  ProviderInfo,
} from './types.js';
import { SpeechEngineError } from './types.js';
import { SonioxSession, type SessionState } from '../core/session.js';
import type { SonioxConfig } from '../types/config.js';
import type { TranscriptResult, ErrorPhase, ConnectionState } from '../types/events.js';

/**
 * Map Soniox session state to provider state
 */
function mapSessionState(state: SessionState): ProviderSessionState {
  switch (state) {
    case 'idle':
      return 'idle';
    case 'starting':
      return 'starting';
    case 'active':
      return 'active';
    case 'stopping':
      return 'stopping';
    case 'stopped':
      return 'stopped';
    case 'error':
      return 'error';
    default:
      return 'idle';
  }
}

/**
 * Map connection state to status
 */
function mapConnectionState(state: ConnectionState): StatusSpeechEvent['status'] {
  switch (state) {
    case 'connecting':
      return 'connecting';
    case 'connected':
      return 'connected';
    case 'disconnected':
      return 'disconnected';
    case 'reconnecting':
      return 'reconnecting';
    case 'closed':
      return 'disconnected';
    default:
      return 'idle';
  }
}

/**
 * Map error phase to error category
 */
function mapErrorCategory(phase: ErrorPhase, error: Error): SpeechErrorCategory {
  const message = error.message.toLowerCase();

  // Check for auth errors
  if (
    message.includes('auth') ||
    message.includes('unauthorized') ||
    message.includes('invalid api key') ||
    message.includes('forbidden')
  ) {
    return 'auth';
  }

  // Check for quota errors
  if (
    message.includes('rate limit') ||
    message.includes('quota') ||
    message.includes('too many')
  ) {
    return 'quota';
  }

  // Check for network errors
  if (
    phase === 'connection' ||
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('connection')
  ) {
    return 'network';
  }

  // Check for unsupported errors
  if (
    message.includes('unsupported') ||
    message.includes('not supported') ||
    message.includes('invalid format')
  ) {
    return 'unsupported';
  }

  // Default to internal
  return 'internal';
}

/**
 * Convert TranscriptResult to SpeechEvent
 */
function transcriptToEvent(result: TranscriptResult): PartialSpeechEvent | FinalSpeechEvent {
  const base = {
    text: result.text,
    confidence: result.words.length > 0
      ? result.words.reduce((sum, w) => sum + w.confidence, 0) / result.words.length
      : undefined,
    timings: {
      words: result.words.map((w) => ({
        word: w.text,
        startMs: w.startMs,
        endMs: w.endMs,
        confidence: w.confidence,
        speaker: w.speaker,
      })),
      audioDurationMs: result.totalAudioProcMs,
    },
    providerMeta: {
      finalAudioProcMs: result.finalAudioProcMs,
      totalAudioProcMs: result.totalAudioProcMs,
    },
  };

  if (result.isFinal) {
    return {
      ...base,
      type: 'final' as const,
      language: result.detectedLanguage,
      translatedText: result.translatedText,
    };
  }

  return {
    ...base,
    type: 'partial' as const,
  };
}

/**
 * Soniox Speech Provider
 *
 * Implements the SpeechProvider interface using Soniox as the backend.
 */
export class SonioxProvider implements SpeechProvider {
  readonly id = 'soniox';
  readonly name = 'Soniox';

  private session: SonioxSession | null = null;
  private handlers = new Set<SpeechEventHandler>();
  private _state: ProviderSessionState = 'idle';
  private credentials: Record<string, string>;
  private defaultConfig: SpeechProviderConfig;

  constructor(
    credentials: Record<string, string>,
    config?: SpeechProviderConfig
  ) {
    this.credentials = credentials;
    this.defaultConfig = config ?? {};
  }

  get state(): ProviderSessionState {
    return this._state;
  }

  async start(config?: SpeechProviderConfig): Promise<void> {
    if (this._state !== 'idle' && this._state !== 'stopped') {
      throw new SpeechEngineError(
        `Cannot start: provider is in ${this._state} state`,
        'internal'
      );
    }

    const mergedConfig = { ...this.defaultConfig, ...config };
    const sonioxConfig = this.buildSonioxConfig(mergedConfig);

    this.session = new SonioxSession(sonioxConfig);
    this.setupSessionListeners();

    this._state = 'starting';
    this.emitStatus('connecting');

    try {
      // Start with microphone - the provider abstraction handles audio capture
      await this.session.startMicrophone({
        sampleRate: mergedConfig.audio?.sampleRate ?? 16000,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      });

      this._state = 'active';
      this.emitStatus('connected');
    } catch (error) {
      this._state = 'error';
      this.emitError(error as Error, 'network', false);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.session || (this._state !== 'active' && this._state !== 'starting')) {
      return;
    }

    this._state = 'stopping';
    this.emitStatus('finalizing');

    try {
      await this.session.stop();
      this._state = 'stopped';
      this.emitStatus('disconnected');
    } catch (error) {
      this._state = 'error';
      throw error;
    }
  }

  abort(): void {
    if (this.session) {
      this.session.abort();
      this._state = 'stopped';
      this.emitStatus('disconnected');
    }
  }

  sendAudio(_data: ArrayBuffer): void {
    // This provider uses microphone input by default.
    // sendAudio is not used - audio is captured internally.
    // For external audio streaming, use the underlying SonioxSession directly
    // or implement a custom provider with buffer-based input.
  }

  subscribe(handler: SpeechEventHandler): SpeechSubscription {
    this.handlers.add(handler);
    return {
      unsubscribe: () => {
        this.handlers.delete(handler);
      },
    };
  }

  dispose(): void {
    if (this.session) {
      this.session.dispose();
      this.session = null;
    }
    this.handlers.clear();
    this._state = 'idle';
  }

  /**
   * Build Soniox config from provider config
   */
  private buildSonioxConfig(config: SpeechProviderConfig): SonioxConfig {
    return {
      apiKey: this.credentials.apiKey || this.credentials.api_key || '',
      audio: {
        format: this.mapEncoding(config.audio?.encoding),
        sampleRate: config.audio?.sampleRate ?? 16000,
        channels: config.audio?.channels ?? 1,
      },
      features: {
        languageHints: config.features?.languageHints,
        enableLanguageIdentification: config.features?.languageDetection,
        enableSpeakerDiarization: config.features?.speakerDiarization,
        translation: config.features?.translation
          ? {
              type: 'one_way',
              targetLanguage: config.features.translation.targetLanguage,
            }
          : undefined,
      },
      reconnection: {
        enabled: config.connection?.autoReconnect ?? true,
        maxAttempts: config.connection?.maxReconnectAttempts ?? 5,
        initialDelayMs: config.connection?.reconnectDelayMs ?? 1000,
      },
    };
  }

  /**
   * Map encoding to Soniox format
   */
  private mapEncoding(
    encoding?: 'pcm_s16le' | 'pcm_f32le' | 'opus' | 'auto'
  ): 'auto' | 'pcm_s16le' | 'pcm_f32le' | 'opus' {
    if (!encoding || encoding === 'auto') {
      return 'auto';
    }
    return encoding;
  }

  /**
   * Set up session event listeners
   */
  private setupSessionListeners(): void {
    if (!this.session) return;

    this.session.on('transcript', (result: TranscriptResult) => {
      const event = transcriptToEvent(result);
      this.emit(event);
    });

    this.session.on('state-change', ({ state }) => {
      this.emitStatus(mapConnectionState(state));
    });

    this.session.on('error', ({ error, phase, recoverable }) => {
      const category = mapErrorCategory(phase, error);
      this.emitError(error, category, recoverable);

      if (!recoverable) {
        this._state = 'error';
      }
    });

    this.session.on('reconnecting', ({ attempt, maxAttempts }) => {
      this.emitStatus('reconnecting');
    });
  }

  /**
   * Emit event to all handlers
   */
  private emit(event: SpeechEvent): void {
    for (const handler of this.handlers) {
      try {
        handler(event);
      } catch (error) {
        console.error('Error in speech event handler:', error);
      }
    }
  }

  /**
   * Emit status event
   */
  private emitStatus(status: StatusSpeechEvent['status']): void {
    this.emit({
      type: 'status',
      text: '',
      status,
    } as StatusSpeechEvent);
  }

  /**
   * Emit error event
   */
  private emitError(
    error: Error,
    category: SpeechErrorCategory,
    recoverable: boolean
  ): void {
    this.emit({
      type: 'error',
      text: '',
      category,
      error: new SpeechEngineError(
        error.message,
        category,
        recoverable,
        undefined,
        error
      ),
      recoverable,
    } as ErrorSpeechEvent);
  }
}

/**
 * Soniox provider info for registry
 */
export const sonioxProviderInfo: ProviderInfo = {
  id: 'soniox',
  name: 'Soniox',
  description: 'Real-time speech-to-text using Soniox API',
  supportedFeatures: [
    'interimResults',
    'speakerDiarization',
    'punctuation',
    'languageHints',
    'languageDetection',
    'customVocabulary',
    'translation',
  ],
  requiredCredentials: ['apiKey'],
  factory: (credentials, config) => new SonioxProvider(credentials, config),
};
