/**
 * Apple Speech Provider
 * SpeechProvider implementation wrapping iOS Speech Framework
 * Only available on iOS devices with React Native
 */

import type {
  SpeechProvider,
  SpeechProviderConfig,
  SpeechEventHandler,
  SpeechSubscription,
  ProviderSessionState,
  SpeechEvent,
  PartialSpeechEvent,
  FinalSpeechEvent,
  ErrorSpeechEvent,
  StatusSpeechEvent,
  SpeechErrorCategory,
} from './types.js';
import { SpeechEngineError } from './types.js';

// Type definitions for the native module
// These match the AppleSpeech Expo module interface
interface AppleSpeechModule {
  checkAvailability(): Promise<{
    available: boolean;
    authorizationStatus: string;
    supportsOnDeviceRecognition: boolean;
    locale: string;
    reason?: string;
  }>;
  requestAuthorization(): Promise<{ status: string; granted: boolean }>;
  startRecognition(options: { locale?: string; onDevice?: boolean }): Promise<string>;
  stopRecognition(sessionId: string): Promise<void>;
  sendAudioBuffer(sessionId: string, base64Data: string): Promise<void>;
  getSupportedLocales(): string[];
  addPartialResultListener(listener: (event: { sessionId: string; text: string }) => void): { remove: () => void };
  addFinalResultListener(listener: (event: { sessionId: string; text: string; confidence: number }) => void): { remove: () => void };
  addErrorListener(listener: (event: { sessionId: string; error: string; code: number }) => void): { remove: () => void };
  addStateChangeListener(listener: (event: { sessionId: string; state: string }) => void): { remove: () => void };
}

// Native module reference - set at runtime
let nativeModule: AppleSpeechModule | null = null;

/**
 * Set the native AppleSpeech module
 * Must be called before using the provider on React Native
 */
export function setAppleSpeechNativeModule(module: AppleSpeechModule): void {
  nativeModule = module;
}

/**
 * Check if AppleSpeech is available
 */
export async function isAppleSpeechAvailable(): Promise<boolean> {
  if (!nativeModule) return false;
  try {
    const result = await nativeModule.checkAvailability();
    return result.available;
  } catch {
    return false;
  }
}

/**
 * Apple Speech Provider
 * Implements SpeechProvider interface using iOS Speech Framework
 */
export class AppleSpeechProvider implements SpeechProvider {
  readonly id = 'apple-speech';
  readonly name = 'Apple Speech';

  private _state: ProviderSessionState = 'idle';
  private _sessionId: string | null = null;
  private _handlers: Set<SpeechEventHandler> = new Set();
  private _subscriptions: { remove: () => void }[] = [];
  private _config: SpeechProviderConfig = {};

  get state(): ProviderSessionState {
    return this._state;
  }

  constructor(config?: SpeechProviderConfig) {
    if (config) {
      this._config = config;
    }
  }

  async start(config?: SpeechProviderConfig): Promise<void> {
    if (!nativeModule) {
      throw new SpeechEngineError(
        'AppleSpeech native module not available',
        'unsupported',
        false
      );
    }

    if (this._state !== 'idle') {
      throw new SpeechEngineError(
        'Provider is not in idle state',
        'internal',
        false
      );
    }

    const mergedConfig = { ...this._config, ...config };
    this._state = 'starting';
    this.emit({ type: 'status', text: '', status: 'connecting' });

    try {
      // Request authorization if needed
      const availability = await nativeModule.checkAvailability();
      if (!availability.available) {
        if (availability.authorizationStatus === 'notDetermined') {
          const auth = await nativeModule.requestAuthorization();
          if (!auth.granted) {
            throw new SpeechEngineError(
              'Speech recognition authorization denied',
              'auth',
              false
            );
          }
        } else if (availability.authorizationStatus === 'denied' || availability.authorizationStatus === 'restricted') {
          throw new SpeechEngineError(
            'Speech recognition not authorized',
            'auth',
            false
          );
        } else {
          throw new SpeechEngineError(
            availability.reason || 'Speech recognition not available',
            'unsupported',
            false
          );
        }
      }

      // Set up event listeners
      this.setupListeners();

      // Start recognition
      const locale = mergedConfig.features?.languageHints?.[0] ?? 'en-US';
      this._sessionId = await nativeModule.startRecognition({
        locale,
        onDevice: true, // Prefer on-device recognition
      });

      this._state = 'active';
      this.emit({ type: 'status', text: '', status: 'connected' });
    } catch (error) {
      this._state = 'error';
      this.cleanupListeners();

      if (error instanceof SpeechEngineError) {
        throw error;
      }

      throw new SpeechEngineError(
        error instanceof Error ? error.message : 'Failed to start recognition',
        'internal',
        false,
        undefined,
        error instanceof Error ? error : undefined
      );
    }
  }

  async stop(): Promise<void> {
    if (!nativeModule || !this._sessionId) {
      this._state = 'idle';
      return;
    }

    if (this._state !== 'active') {
      return;
    }

    this._state = 'stopping';
    this.emit({ type: 'status', text: '', status: 'finalizing' });

    try {
      await nativeModule.stopRecognition(this._sessionId);
    } catch {
      // Ignore stop errors
    }

    // Wait a bit for final results
    await new Promise((resolve) => setTimeout(resolve, 100));

    this.cleanupListeners();
    this._sessionId = null;
    this._state = 'idle';
    this.emit({ type: 'status', text: '', status: 'disconnected' });
  }

  abort(): void {
    if (!nativeModule || !this._sessionId) {
      this._state = 'idle';
      return;
    }

    nativeModule.stopRecognition(this._sessionId).catch(() => {});
    this.cleanupListeners();
    this._sessionId = null;
    this._state = 'idle';
    this.emit({ type: 'status', text: '', status: 'disconnected' });
  }

  sendAudio(data: ArrayBuffer): void {
    if (!nativeModule || !this._sessionId || this._state !== 'active') {
      return;
    }

    // Convert ArrayBuffer to base64
    const base64 = arrayBufferToBase64(data);
    nativeModule.sendAudioBuffer(this._sessionId, base64).catch(() => {});
  }

  subscribe(handler: SpeechEventHandler): SpeechSubscription {
    this._handlers.add(handler);
    return {
      unsubscribe: () => {
        this._handlers.delete(handler);
      },
    };
  }

  dispose(): void {
    this.abort();
    this._handlers.clear();
    this._state = 'idle';
  }

  // Private methods

  private emit(event: SpeechEvent): void {
    for (const handler of this._handlers) {
      try {
        handler(event);
      } catch {
        // Ignore handler errors
      }
    }
  }

  private setupListeners(): void {
    if (!nativeModule) return;

    // Partial results
    this._subscriptions.push(
      nativeModule.addPartialResultListener((event) => {
        if (event.sessionId !== this._sessionId) return;

        const partialEvent: PartialSpeechEvent = {
          type: 'partial',
          text: event.text,
        };
        this.emit(partialEvent);
      })
    );

    // Final results
    this._subscriptions.push(
      nativeModule.addFinalResultListener((event) => {
        if (event.sessionId !== this._sessionId) return;

        const finalEvent: FinalSpeechEvent = {
          type: 'final',
          text: event.text,
          confidence: event.confidence,
        };
        this.emit(finalEvent);
      })
    );

    // Errors
    this._subscriptions.push(
      nativeModule.addErrorListener((event) => {
        if (event.sessionId !== this._sessionId) return;

        const category = mapErrorCodeToCategory(event.code);
        const errorEvent: ErrorSpeechEvent = {
          type: 'error',
          text: '',
          category,
          error: new Error(event.error),
          recoverable: category === 'network',
        };
        this.emit(errorEvent);

        this._state = 'error';
      })
    );

    // State changes
    this._subscriptions.push(
      nativeModule.addStateChangeListener((event) => {
        if (event.sessionId !== this._sessionId) return;

        if (event.state === 'stopped') {
          this._state = 'idle';
          this.emit({ type: 'status', text: '', status: 'disconnected' });
        }
      })
    );
  }

  private cleanupListeners(): void {
    for (const sub of this._subscriptions) {
      sub.remove();
    }
    this._subscriptions = [];
  }
}

// Helper functions

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  // Use btoa if available (browser), otherwise use Buffer (Node)
  if (typeof btoa !== 'undefined') {
    return btoa(binary);
  }
  // For React Native, we might need a polyfill
  // This is a fallback implementation
  return Buffer.from(buffer).toString('base64');
}

function mapErrorCodeToCategory(code: number): SpeechErrorCategory {
  // Apple Speech error codes
  switch (code) {
    case 1: // Network error
    case 4: // Server error
      return 'network';
    case 2: // Audio error
    case 3: // No speech detected
      return 'internal';
    case 5: // Not authorized
      return 'auth';
    case 6: // Not supported
    case 7: // Rate limited
      return 'quota';
    default:
      return 'internal';
  }
}

/**
 * Factory function for creating AppleSpeechProvider
 */
export function createAppleSpeechProvider(
  _credentials: Record<string, string>,
  config?: SpeechProviderConfig
): SpeechProvider {
  return new AppleSpeechProvider(config);
}
