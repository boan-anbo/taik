/**
 * Soniox Session - real-time speech-to-text streaming (React Native)
 *
 * This variant avoids importing `../runtime/detect.js` so Metro never attempts
 * to bundle Node-only adapters (and their Node builtins).
 */

import type { SonioxConfig, Logger } from '../types/config.js';
import type {
  SessionEventMap,
  TranscriptResult,
  ConnectionState,
} from '../types/events.js';
import type { AudioSource, AudioChunk, MicrophoneOptions, FileSourceOptions, BufferSourceOptions } from '../types/audio.js';
import { EventEmitter } from '../utils/event-emitter.js';
import { createLogger } from '../utils/logger.js';
import { ConfigError } from '../utils/errors.js';
import { getRuntimeAdapter } from '../runtime/index.react-native.js';
import type { RuntimeAdapter } from '../runtime/adapter.js';
import { WebSocketTransport } from '../transport/websocket-transport.js';
import { MicrophoneSource } from '../audio/sources/microphone-source.js';
import { FileSource } from '../audio/sources/file-source.js';
import { BufferSource } from '../audio/sources/buffer-source.js';

/**
 * Session state
 */
export type SessionState = 'idle' | 'starting' | 'active' | 'stopping' | 'stopped' | 'error';

/**
 * SonioxSession - main class for real-time speech-to-text
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
   * Start transcription with a custom audio source
   */
  async startWithSource(source: AudioSource): Promise<void> {
    if (this.state !== 'idle' && this.state !== 'stopped') {
      throw new Error(`Cannot start: session is in ${this.state} state`);
    }

    this.setState('starting');
    this.results = [];
    this.fullText = '';

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

      // Wait for finished message or timeout
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          this.logger.warn('Timeout waiting for final transcript');
          resolve();
        }, 5000);

        this.transport?.once('finished', () => {
          clearTimeout(timeout);
          resolve();
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
      this.adapter = getRuntimeAdapter();
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
      // Track results
      if (result.isFinal) {
        this.results.push(result);
        this.fullText += result.text;
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

