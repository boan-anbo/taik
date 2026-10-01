/**
 * Soniox Session - real-time speech-to-text streaming
 */

import type { SonioxConfig, Logger } from '../types/config.js';
import type {
  SessionEventMap,
  TranscriptResult,
  ConnectionState,
} from '../types/events.js';
import type { AudioSource, AudioChunk, MicrophoneOptions, FileSourceOptions, BufferSourceOptions } from '../types/audio.js';
import { DEFAULT_CONFIG } from '../types/config.js';
import { EventEmitter } from '../utils/event-emitter.js';
import { createLogger } from '../utils/logger.js';
import { ConfigError, AudioError } from '../utils/errors.js';
import { getRuntimeAdapter } from '../runtime/detect.js';
import type { RuntimeAdapter } from '../runtime/adapter.js';
import { WebSocketTransport } from '../transport/websocket-transport.js';
import { MicrophoneSource } from '../audio/sources/microphone-source.js';
import { FileSource } from '../audio/sources/file-source.js';
import { BufferSource } from '../audio/sources/buffer-source.js';
import { MediaStreamSource, type MediaStreamSourceOptions } from '../audio/sources/media-stream-source.js';

/**
 * Session state
 */
export type SessionState = 'idle' | 'starting' | 'active' | 'stopping' | 'stopped' | 'error';

/**
 * SonioxSession - main class for real-time speech-to-text
 *
 * @example
 * ```typescript
 * const session = new SonioxSession({
 *   apiKey: 'your-api-key',
 *   features: {
 *     enableSpeakerDiarization: true,
 *     languageHints: ['en'],
 *   },
 * });
 *
 * session.on('transcript', (result) => {
 *   console.log(result.text);
 * });
 *
 * // Start with microphone
 * await session.startMicrophone();
 *
 * // Or with a file
 * await session.startFile({ path: './audio.wav' });
 *
 * // Stop when done
 * await session.stop();
 * ```
 */
export class SonioxSession extends EventEmitter<SessionEventMap> {
  private config: SonioxConfig;
  private logger: Logger;
  private adapter: RuntimeAdapter | null = null;
  private transport: WebSocketTransport | null = null;
  private audioSource: AudioSource | null = null;
  private state: SessionState = 'idle';
  private results: TranscriptResult[] = [];
  private fullText = '';
  private lastTranscriptAt = 0;
  private lastTranscriptWasPartial = false;
  private lastPartialResult: TranscriptResult | null = null;
  private lastPartialEndMs = -1;
  private maxFinalTokenEndMs = -1;

  constructor(config: SonioxConfig) {
    super();
    this.validateConfig(config);
    this.config = config;
    this.logger = createLogger(config.logging);
  }

  /**
   * Get current session state
   */
  getState(): SessionState {
    return this.state;
  }

  /**
   * Get connection state
   */
  getConnectionState(): ConnectionState {
    return this.transport?.getState() ?? 'disconnected';
  }

  /**
   * Start transcription from microphone
   */
  async startMicrophone(options: MicrophoneOptions = {}): Promise<void> {
    await this.ensureAdapter();
    const source = new MicrophoneSource(this.adapter!, options);
    await this.startWithSource(source);
  }

  /**
   * Start transcription from a file
   */
  async startFile(options: FileSourceOptions): Promise<void> {
    await this.ensureAdapter();
    const source = new FileSource(this.adapter!, options);
    await this.startWithSource(source);
  }

  /**
   * Start transcription from an in-memory buffer
   */
  async startBuffer(options: BufferSourceOptions): Promise<void> {
    const source = new BufferSource(options);
    await this.startWithSource(source);
  }

  /**
   * Start transcription from an existing MediaStream
   * Use this when you already have a MediaStream (e.g., from useAudioStreamManager)
   * and want to share it between visualization and transcription.
   *
   * @example
   * ```typescript
   * // Get stream from your stream manager
   * const stream = await streamManager.startStream();
   *
   * // Start transcription with the same stream
   * await session.startMediaStream({
   *   stream,
   *   stopTracksOnStop: false, // Keep stream alive for visualization
   * });
   * ```
   */
  async startMediaStream(options: MediaStreamSourceOptions): Promise<void> {
    const source = new MediaStreamSource(options);
    await this.startWithSource(source);
  }

  /**
   * Start transcription with a custom audio source
   */
  async startWithSource(source: AudioSource): Promise<void> {
    if (this.state !== 'idle' && this.state !== 'stopped') {
      throw new Error(`Cannot start: session is in ${this.state} state`);
    }

    this.setState('starting');
    this.results = [];
    this.fullText = '';
    this.lastTranscriptAt = Date.now();
    this.lastTranscriptWasPartial = false;
    this.lastPartialResult = null;
    this.lastPartialEndMs = -1;
    this.maxFinalTokenEndMs = -1;

    try {
      await this.ensureAdapter();

      // Create transport
      this.transport = new WebSocketTransport(this.config, this.adapter!, this.logger);
      this.setupTransportEvents();

      // Connect to Soniox
      await this.transport.connect();

      // Set up audio source
      this.audioSource = source;
      this.setupAudioSourceEvents();

      // Start audio capture
      await this.audioSource.start();
      this.emit('audio-start');

      this.setState('active');
    } catch (error) {
      this.setState('error');
      this.cleanup();
      throw error;
    }
  }

  /**
   * Stop the transcription session
   */
  async stop(): Promise<void> {
    if (this.state !== 'active' && this.state !== 'starting') {
      return;
    }

    this.setState('stopping');

    // Stop audio source first
    if (this.audioSource) {
      try {
        await this.audioSource.stop();
        this.emit('audio-end');
      } catch (error) {
        this.logger.error('Error stopping audio source', error);
      }
    }

    // Send finalize to get remaining transcripts
    if (this.transport?.isReady()) {
      this.transport.sendFinalize();

      // Wait briefly for trailing tokens / finished message.
      // In practice Soniox may not send `finished` reliably; for good UX we also treat
      // a short quiet period (no transcript events) as "done".
      //
      // IMPORTANT: If the user stops while the last utterance is still partial, we should
      // wait until it becomes final (or time out), rather than promoting partial text.
      const quietMs = 250;
      const finalizeAt = Date.now();
      const hadPendingPartialOnStop =
        this.lastTranscriptWasPartial && Boolean(this.lastPartialResult?.text?.trim());

      // Defaults tuned for fast UX:
      // - If everything is already final, stop should feel near-instant.
      // - If the user stops mid-utterance, allow a short window to finalize.
      const maxWaitMs =
        this.config.finalizeTimeoutMs ??
        (hadPendingPartialOnStop ? 2000 : 800);
      const minWaitMs =
        this.config.finalizeMinWaitMs ??
        (hadPendingPartialOnStop ? 200 : 0);

      await new Promise<void>((resolve) => {
        let resolved = false;

        const cleanup = () => {
          resolved = true;
          clearTimeout(timeout);
          clearTimeout(quietTimer);
        };

        const finish = () => {
          if (resolved) return;
          cleanup();
          resolve();
        };

        const timeout = setTimeout(() => {
          this.logger.warn('Timeout waiting for final transcript');
          finish();
        }, maxWaitMs);

        const checkQuiet = () => {
          if (resolved) return;
          const sinceFinalize = Date.now() - finalizeAt;
          const sinceLast = Date.now() - this.lastTranscriptAt;

          // If we stopped while the last utterance was still partial, give Soniox a short window
          // to finalize it before we allow quiet-based completion.
          if (hadPendingPartialOnStop && sinceFinalize < minWaitMs) {
            quietTimer = setTimeout(checkQuiet, minWaitMs - sinceFinalize);
            return;
          }

          // Strict mode: don't finish while there's still a pending partial segment.
          if (hadPendingPartialOnStop && this.lastPartialResult?.text?.trim()) {
            // Keep polling until Soniox turns it into a final segment (or we time out).
            quietTimer = setTimeout(checkQuiet, quietMs);
            return;
          }

          if (sinceLast >= quietMs) {
            finish();
            return;
          }
          quietTimer = setTimeout(checkQuiet, quietMs - sinceLast);
        };

        let quietTimer = setTimeout(checkQuiet, quietMs);

        this.transport?.once('finished', () => {
          finish();
        });
      });
    }

    // Emit completed event
    this.emit('completed', {
      fullText: this.fullText,
      results: this.results,
    });

    this.cleanup();
    this.setState('stopped');
  }

  /**
   * Abort the session immediately without waiting for final transcript
   */
  abort(): void {
    this.cleanup();
    this.setState('stopped');
  }

  /**
   * Dispose of all resources
   */
  dispose(): void {
    this.cleanup();
    this.removeAllListeners();
  }

  /**
   * Validate configuration
   */
  private validateConfig(config: SonioxConfig): void {
    if (!config.apiKey) {
      throw new ConfigError('API key is required', 'apiKey');
    }
  }

  /**
   * Ensure runtime adapter is loaded
   */
  private async ensureAdapter(): Promise<void> {
    if (!this.adapter) {
      this.adapter = await getRuntimeAdapter();
      this.logger.debug(`Using ${this.adapter.type} runtime adapter`);
    }
  }

  /**
   * Set up transport event handlers
   */
  private setupTransportEvents(): void {
    if (!this.transport) return;

    this.transport.on('state-change', (payload) => {
      this.emit('state-change', payload);
    });

    this.transport.on('connected', () => {
      this.emit('connected');
    });

    this.transport.on('disconnected', (payload) => {
      this.emit('disconnected', payload);
    });

    this.transport.on('error', (payload) => {
      this.emit('error', {
        ...payload,
        phase: 'connection',
      });

      if (!payload.recoverable) {
        this.setState('error');
      }
    });

    this.transport.on('transcript', (result) => {
      this.lastTranscriptAt = Date.now();
      this.lastTranscriptWasPartial = !result.isFinal;
      // Track results
      if (result.isFinal) {
        this.results.push(result);
        this.fullText += result.text;

        const endMs = maxEndMs(result.words);
        if (endMs > this.maxFinalTokenEndMs) {
          this.maxFinalTokenEndMs = endMs;
        }

        // If the previously pending partial is now covered by a final segment, clear it.
        if (this.lastPartialEndMs >= 0 && endMs >= this.lastPartialEndMs) {
          this.lastPartialResult = null;
          this.lastPartialEndMs = -1;
        }
      } else {
        this.lastPartialResult = result;
        this.lastPartialEndMs = maxEndMs(result.words);
      }

      this.emit('transcript', result);
    });

    this.transport.on('reconnecting', (payload) => {
      this.emit('reconnecting', payload);
    });

    this.transport.on('reconnect-failed', (payload) => {
      this.emit('reconnect-failed', payload);
      this.setState('error');
    });
  }

  /**
   * Set up audio source event handlers
   */
  private setupAudioSourceEvents(): void {
    if (!this.audioSource) return;

    this.audioSource.onChunk((chunk: AudioChunk) => {
      if (this.transport?.isReady()) {
        this.transport.sendAudio(chunk.data);
      }
    });

    this.audioSource.onError((error: Error) => {
      this.emit('error', {
        error,
        phase: 'audio',
        recoverable: false,
      });
      this.setState('error');
    });

    this.audioSource.onStateChange((state) => {
      // Auto-stop session when audio source completes (for file sources)
      if (state === 'stopped' && this.state === 'active') {
        this.stop();
      }
    });
  }

  /**
   * Clean up resources
   */
  private cleanup(): void {
    if (this.audioSource) {
      this.audioSource.dispose();
      this.audioSource = null;
    }

    if (this.transport) {
      this.transport.disconnect();
      this.transport.removeAllListeners();
      this.transport = null;
    }
  }

  /**
   * Update session state
   */
  private setState(newState: SessionState): void {
    if (this.state === newState) return;
    this.state = newState;
    this.logger.debug(`Session state: ${newState}`);
  }
}

function maxEndMs(words: { startMs: number; endMs: number }[]): number {
  let max = -1;
  for (const w of words) {
    if (typeof w.endMs === 'number' && w.endMs > max) max = w.endMs;
    else if (typeof w.startMs === 'number' && w.startMs > max) max = w.startMs;
  }
  return max;
}
