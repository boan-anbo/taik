/**
 * Whisper Provider
 * SpeechProvider implementation wrapping local Whisper model
 * Provides offline speech recognition using whisper.cpp
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
interface WhisperNativeModule {
  checkAvailability(): Promise<{
    available: boolean;
    modelLoaded: boolean;
    modelPath: string | null;
    supportedModels: string[];
  }>;
  loadModel(modelPath: string): Promise<void>;
  unloadModel(): Promise<void>;
  startTranscription(options: { language?: string; translate?: boolean }): Promise<string>;
  processAudioBuffer(sessionId: string, base64Data: string): Promise<void>;
  stopTranscription(sessionId: string): Promise<void>;
  downloadModel(modelId: string): Promise<{ modelId: string; path: string; alreadyDownloaded: boolean }>;
  getModelPath(modelId: string): string | null;
  deleteModel(modelId: string): Promise<void>;
  addPartialResultListener(listener: (event: { sessionId: string; text: string }) => void): { remove: () => void };
  addFinalResultListener(listener: (event: { sessionId: string; text: string; confidence: number }) => void): { remove: () => void };
  addErrorListener(listener: (event: { sessionId: string; error: string }) => void): { remove: () => void };
  addStateChangeListener(listener: (event: { sessionId?: string; state: string; modelPath?: string }) => void): { remove: () => void };
  addDownloadProgressListener(listener: (event: { modelId: string; progress: number }) => void): { remove: () => void };
}

// Native module reference - set at runtime
let nativeModule: WhisperNativeModule | null = null;

/**
 * Set the native Whisper module
 * Must be called before using the provider on React Native
 */
export function setWhisperNativeModule(module: WhisperNativeModule): void {
  nativeModule = module;
}

/**
 * Check if Whisper is available
 */
export async function isWhisperAvailable(): Promise<boolean> {
  if (!nativeModule) return false;
  try {
    const result = await nativeModule.checkAvailability();
    return result.available;
  } catch {
    return false;
  }
}

/**
 * Download a Whisper model
 */
export async function downloadWhisperModel(
  modelId: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  if (!nativeModule) {
    throw new SpeechEngineError('Whisper native module not available', 'unsupported', false);
  }

  let progressSub: { remove: () => void } | null = null;
  if (onProgress) {
    progressSub = nativeModule.addDownloadProgressListener((event) => {
      if (event.modelId === modelId) {
        onProgress(event.progress);
      }
    });
  }

  try {
    const result = await nativeModule.downloadModel(modelId);
    return result.path;
  } finally {
    progressSub?.remove();
  }
}

/**
 * Whisper Provider
 * Implements SpeechProvider interface using local Whisper model
 */
export class WhisperProvider implements SpeechProvider {
  readonly id = 'whisper';
  readonly name = 'Whisper (Local)';

  private _state: ProviderSessionState = 'idle';
  private _sessionId: string | null = null;
  private _handlers: Set<SpeechEventHandler> = new Set();
  private _subscriptions: { remove: () => void }[] = [];
  private _config: SpeechProviderConfig = {};
  private _modelPath: string | null = null;
  private _audioBuffer: ArrayBuffer[] = [];

  get state(): ProviderSessionState {
    return this._state;
  }

  constructor(config?: SpeechProviderConfig & { modelPath?: string }) {
    if (config) {
      this._config = config;
      this._modelPath = config.modelPath ?? null;
    }
  }

  async start(config?: SpeechProviderConfig): Promise<void> {
    if (!nativeModule) {
      throw new SpeechEngineError(
        'Whisper native module not available',
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
      // Check availability
      const availability = await nativeModule.checkAvailability();
      if (!availability.modelLoaded && this._modelPath) {
        // Load model if we have a path
        await nativeModule.loadModel(this._modelPath);
      } else if (!availability.modelLoaded) {
        throw new SpeechEngineError(
          'No Whisper model loaded. Download and load a model first.',
          'unsupported',
          false
        );
      }

      // Set up event listeners
      this.setupListeners();

      // Start transcription
      const language = mergedConfig.features?.languageHints?.[0];
      this._sessionId = await nativeModule.startTranscription({
        language,
        translate: false,
      });

      this._state = 'active';
      this._audioBuffer = [];
      this.emit({ type: 'status', text: '', status: 'connected' });
    } catch (error) {
      this._state = 'error';
      this.cleanupListeners();

      if (error instanceof SpeechEngineError) {
        throw error;
      }

      throw new SpeechEngineError(
        error instanceof Error ? error.message : 'Failed to start Whisper',
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
      await nativeModule.stopTranscription(this._sessionId);
    } catch {
      // Ignore stop errors
    }

    // Wait for final results
    await new Promise((resolve) => setTimeout(resolve, 500));

    this.cleanupListeners();
    this._sessionId = null;
    this._audioBuffer = [];
    this._state = 'idle';
    this.emit({ type: 'status', text: '', status: 'disconnected' });
  }

  abort(): void {
    if (!nativeModule || !this._sessionId) {
      this._state = 'idle';
      return;
    }

    nativeModule.stopTranscription(this._sessionId).catch(() => {});
    this.cleanupListeners();
    this._sessionId = null;
    this._audioBuffer = [];
    this._state = 'idle';
    this.emit({ type: 'status', text: '', status: 'disconnected' });
  }

  sendAudio(data: ArrayBuffer): void {
    if (!nativeModule || !this._sessionId || this._state !== 'active') {
      return;
    }

    // Buffer audio and process in chunks
    this._audioBuffer.push(data);

    // Process when we have enough data (e.g., 1 second of audio at 16kHz)
    const totalBytes = this._audioBuffer.reduce((sum, buf) => sum + buf.byteLength, 0);
    const bytesPerSecond = 16000 * 2; // 16kHz, 16-bit

    if (totalBytes >= bytesPerSecond) {
      // Concatenate buffers
      const combined = new Uint8Array(totalBytes);
      let offset = 0;
      for (const buf of this._audioBuffer) {
        combined.set(new Uint8Array(buf), offset);
        offset += buf.byteLength;
      }
      this._audioBuffer = [];

      // Convert to base64 and send
      const base64 = arrayBufferToBase64(combined.buffer);
      nativeModule.processAudioBuffer(this._sessionId, base64).catch(() => {});
    }
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

        const errorEvent: ErrorSpeechEvent = {
          type: 'error',
          text: '',
          category: 'internal',
          error: new Error(event.error),
          recoverable: false,
        };
        this.emit(errorEvent);

        this._state = 'error';
      })
    );

    // State changes
    this._subscriptions.push(
      nativeModule.addStateChangeListener((event) => {
        if (event.sessionId && event.sessionId !== this._sessionId) return;

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
  if (typeof btoa !== 'undefined') {
    return btoa(binary);
  }
  return Buffer.from(buffer).toString('base64');
}

/**
 * Factory function for creating WhisperProvider
 */
export function createWhisperProvider(
  credentials: Record<string, string>,
  config?: SpeechProviderConfig
): SpeechProvider {
  return new WhisperProvider({
    ...config,
    modelPath: credentials.modelPath,
  } as SpeechProviderConfig & { modelPath?: string });
}
