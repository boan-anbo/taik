/**
 * WebSocket transport layer
 * Manages connection to Soniox WebSocket API
 */

import type { SonioxConfig } from '../types/config.js';
import type {
  ConnectionState,
  TranscriptResult,
  TranscriptWord,
  SessionEventMap,
} from '../types/events.js';
import type {
  ProtocolTranscriptMessage,
  ProtocolToken,
} from '../types/protocol.js';
import {
  buildConfigMessage,
  isFinishedMessage,
  isErrorMessage,
} from '../types/protocol.js';
import { DEFAULT_CONFIG } from '../types/config.js';
import type { WebSocketConnection, RuntimeAdapter } from '../runtime/adapter.js';
import type { AsyncWebSocketAdapter } from '../runtime/node-adapter.js';
import { EventEmitter } from '../utils/event-emitter.js';
import { ConnectionError, ProtocolError, getErrorMessage } from '../utils/errors.js';
import type { Logger } from '../types/config.js';
import { ReconnectionManager } from './reconnection-manager.js';

/** Transport event map */
interface TransportEventMap {
  'state-change': { state: ConnectionState; previousState: ConnectionState };
  connected: void;
  disconnected: { code: number; reason: string };
  error: { error: Error; recoverable: boolean };
  transcript: TranscriptResult;
  finished: void;
  reconnecting: { attempt: number; maxAttempts: number; delayMs: number };
  'reconnect-failed': { attempts: number };
}

/**
 * WebSocket transport for Soniox API
 */
export class WebSocketTransport extends EventEmitter<TransportEventMap> {
  private config: SonioxConfig;
  private adapter: RuntimeAdapter;
  private logger: Logger;
  private ws: WebSocketConnection | null = null;
  private state: ConnectionState = 'disconnected';
  private reconnectionManager: ReconnectionManager;
  private configSent = false;
  private keepaliveInterval: ReturnType<typeof setInterval> | null = null;
  private clientReferenceId: string;
  private maxFinalTokenEndMs = -1;

  constructor(config: SonioxConfig, adapter: RuntimeAdapter, logger: Logger) {
    super();
    this.config = config;
    this.adapter = adapter;
    this.logger = logger;
    this.clientReferenceId = `taik-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    const reconnectionConfig = {
      ...DEFAULT_CONFIG.reconnection,
      ...config.reconnection,
    };

    this.reconnectionManager = new ReconnectionManager(
      reconnectionConfig.enabled ?? true,
      reconnectionConfig.maxAttempts ?? 5,
      reconnectionConfig.initialDelayMs ?? 1000,
      reconnectionConfig.maxDelayMs ?? 30000,
      reconnectionConfig.backoffMultiplier ?? 2
    );
  }

  /** Get current connection state */
  getState(): ConnectionState {
    return this.state;
  }

  /** Check if connected and ready */
  isReady(): boolean {
    return this.state === 'connected' && this.configSent;
  }

  /**
   * Connect to Soniox WebSocket API
   */
  async connect(): Promise<void> {
    if (this.state === 'connected' || this.state === 'connecting') {
      this.logger.warn('Already connected or connecting');
      return;
    }

    this.setState('connecting');

    try {
      await this.createConnection();
    } catch (error) {
      this.setState('disconnected');
      throw error;
    }
  }

  /**
   * Send audio data
   */
  sendAudio(data: ArrayBuffer): void {
    if (!this.isReady()) {
      this.logger.warn('Cannot send audio: not connected');
      return;
    }

    try {
      this.ws!.send(data);
    } catch (error) {
      this.logger.error('Failed to send audio', error);
      this.handleError(new ConnectionError('Failed to send audio', undefined, error as Error));
    }
  }

  /**
   * Send finalize message to end transcription
   */
  sendFinalize(): void {
    if (!this.isReady()) {
      this.logger.warn('Cannot finalize: not connected');
      return;
    }

    try {
      this.ws!.send(JSON.stringify({ type: 'finalize' }));
      this.logger.debug('Sent finalize message');
    } catch (error) {
      this.logger.error('Failed to send finalize', error);
    }
  }

  /**
   * Send keepalive message
   */
  sendKeepalive(): void {
    if (!this.isReady()) {
      return;
    }

    try {
      this.ws!.send(JSON.stringify({ type: 'keepalive' }));
      this.logger.debug('Sent keepalive');
    } catch (error) {
      this.logger.error('Failed to send keepalive', error);
    }
  }

  /**
   * Disconnect from the WebSocket
   */
  disconnect(): void {
    this.stopKeepalive();
    this.reconnectionManager.reset();

    if (this.ws) {
      try {
        this.ws.close(1000, 'Client disconnect');
      } catch {
        // Ignore close errors
      }
      this.ws = null;
    }

    this.setState('closed');
    this.configSent = false;
  }

  /**
   * Create WebSocket connection
   */
  private async createConnection(): Promise<void> {
    const endpoint = this.config.endpoint ?? DEFAULT_CONFIG.endpoint;

    this.logger.debug(`Connecting to ${endpoint}`);

    // Handle async WebSocket creation for Node.js
    if ('createAsync' in this.adapter.websocket) {
      this.ws = await (this.adapter.websocket as AsyncWebSocketAdapter).createAsync(endpoint);
    } else {
      this.ws = this.adapter.websocket.create(endpoint);
    }

    // Set up event handlers
    this.ws.onOpen(() => this.handleOpen());
    this.ws.onMessage((data) => this.handleMessage(data));
    this.ws.onError((error) => this.handleError(new ConnectionError(error.message, undefined, error)));
    this.ws.onClose((code, reason) => this.handleClose(code, reason));

    // Wait for connection to open
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new ConnectionError('Connection timeout'));
      }, 30000);

      const cleanup = () => {
        clearTimeout(timeout);
      };

      this.once('connected', () => {
        cleanup();
        resolve();
      });

      this.once('error', ({ error }) => {
        cleanup();
        reject(error);
      });
    });
  }

  /**
   * Handle WebSocket open
   */
  private handleOpen(): void {
    this.logger.info('WebSocket connected');
    this.reconnectionManager.reset();
    this.sendConfig();
  }

  /**
   * Send initial configuration message
   */
  private sendConfig(): void {
    const audioConfig = {
      ...DEFAULT_CONFIG.audio,
      ...this.config.audio,
    };

    const configMsg = buildConfigMessage(
      this.config.apiKey,
      this.config.model ?? DEFAULT_CONFIG.model,
      audioConfig.format ?? 'auto',
      audioConfig.format !== 'auto' ? audioConfig.sampleRate : undefined,
      audioConfig.format !== 'auto' ? audioConfig.channels : undefined,
      this.config.features
        ? {
            languageHints: this.config.features.languageHints,
            enableLanguageIdentification: this.config.features.enableLanguageIdentification,
            enableSpeakerDiarization: this.config.features.enableSpeakerDiarization,
            enableEndpointDetection: this.config.features.enableEndpointDetection,
            context: this.config.features.context,
            translation: this.config.features.translation,
          }
        : undefined,
      this.clientReferenceId
    );

    this.ws!.send(JSON.stringify(configMsg));
    this.logger.debug('Sent config message');

    this.configSent = true;
    this.setState('connected');
    this.emit('connected');
    this.startKeepalive();
  }

  /**
   * Handle incoming WebSocket message
   */
  private handleMessage(data: ArrayBuffer | string): void {
    if (typeof data !== 'string') {
      this.logger.warn('Received binary message, expected JSON');
      return;
    }

    try {
      const message = JSON.parse(data) as ProtocolTranscriptMessage;

      // Check for errors
      if (isErrorMessage(message)) {
        const errorMsg = getErrorMessage(message.error_code, message.error_message);
        this.handleError(new ProtocolError(errorMsg, message.error_code));
        return;
      }

      // Check for completion
      if (isFinishedMessage(message)) {
        this.logger.info('Transcription finished');
        this.emit('finished');
        return;
      }

      // Soniox streams token-level finalization. A message may contain a mix of final and non-final tokens.
      // If we only emit "final" when *all* tokens are final, long dictations tend to collapse into the last
      // utterance (earlier finalized tokens were never emitted). Split each message into:
      // - newly-finalized tokens (emitted as a `TranscriptResult` with `isFinal=true`)
      // - currently non-final tokens (emitted as a `TranscriptResult` with `isFinal=false`)
      const isSpecialToken = (text: string) => /^<[^>]+>$/.test(text);
      const meaningfulTokens = message.tokens.filter((t) => !isSpecialToken(t.text));

      const finalTokens = meaningfulTokens.filter((t) => t.is_final);
      const partialTokens = meaningfulTokens.filter((t) => !t.is_final);

      const getTokenEndMs = (t: ProtocolToken): number => {
        if (typeof t.end_ms === 'number') return t.end_ms;
        if (typeof t.start_ms === 'number') return t.start_ms;
        return -1;
      };

      // Deduplicate: Soniox may resend earlier finalized tokens. Use timing to emit only newly-finalized ones.
      const newFinalTokens = finalTokens.filter((t) => {
        const endMs = getTokenEndMs(t);
        if (endMs < 0) {
          // No timing info. Treat as new to avoid losing text (may cause duplication in rare cases).
          return true;
        }
        return endMs > this.maxFinalTokenEndMs;
      });

      const maxEndInFinalTokens = finalTokens.reduce((max, t) => {
        const endMs = getTokenEndMs(t);
        return endMs > max ? endMs : max;
      }, this.maxFinalTokenEndMs);
      this.maxFinalTokenEndMs = maxEndInFinalTokens;

      const finalResult =
        newFinalTokens.length > 0
          ? this.parseTranscriptTokens(message, newFinalTokens, true)
          : null;
      if (finalResult && (finalResult.text || finalResult.words.length > 0)) {
        this.emit('transcript', finalResult);
      }

      const partialResult =
        partialTokens.length > 0
          ? this.parseTranscriptTokens(message, partialTokens, false)
          : null;
      if (partialResult && (partialResult.text || partialResult.words.length > 0)) {
        this.emit('transcript', partialResult);
      }
    } catch (error) {
      this.logger.error('Failed to parse message', error);
    }
  }

  /**
   * Parse a token subset into TranscriptResult
   */
  private parseTranscriptTokens(
    message: ProtocolTranscriptMessage,
    tokens: ProtocolToken[],
    isFinal: boolean
  ): TranscriptResult {
    const words: TranscriptWord[] = tokens.map((token: ProtocolToken) => ({
      text: token.text,
      startMs: token.start_ms ?? 0,
      endMs: token.end_ms ?? 0,
      confidence: token.confidence,
      speaker: token.speaker,
      language: token.language,
    }));

    const text = tokens.map((t) => t.text).join('');

    // Get detected language from first token with language (keep searching the full message)
    const detectedLanguage = message.tokens.find((t) => t.language)?.language;
    const sourceLanguage = message.tokens.find((t) => t.source_language)?.source_language;

    return {
      text,
      isFinal,
      words,
      detectedLanguage,
      sourceLanguage,
      finalAudioProcMs: message.final_audio_proc_ms,
      totalAudioProcMs: message.total_audio_proc_ms,
    };
  }

  /**
   * Handle WebSocket error
   */
  private handleError(error: ConnectionError | ProtocolError): void {
    this.logger.error('WebSocket error', error);

    this.emit('error', {
      error,
      recoverable: error.recoverable,
    });

    if (error.recoverable && this.reconnectionManager.isEnabled()) {
      this.attemptReconnect();
    }
  }

  /**
   * Handle WebSocket close
   */
  private handleClose(code: number, reason: string): void {
    this.logger.info(`WebSocket closed: ${code} ${reason}`);
    this.stopKeepalive();
    this.configSent = false;

    const wasConnected = this.state === 'connected';
    this.setState('disconnected');
    this.emit('disconnected', { code, reason });

    // Attempt reconnect for unexpected closures
    if (wasConnected && code !== 1000 && this.reconnectionManager.isEnabled()) {
      this.attemptReconnect();
    }
  }

  /**
   * Attempt to reconnect
   */
  private async attemptReconnect(): Promise<void> {
    if (!this.reconnectionManager.canAttempt()) {
      this.logger.warn('Max reconnection attempts reached');
      this.emit('reconnect-failed', {
        attempts: this.reconnectionManager.getAttempts(),
      });
      return;
    }

    const delay = this.reconnectionManager.getNextDelay();
    const attempt = this.reconnectionManager.getAttempts() + 1;
    const maxAttempts = this.reconnectionManager.getMaxAttempts();

    this.logger.info(`Reconnecting in ${delay}ms (attempt ${attempt}/${maxAttempts})`);
    this.setState('reconnecting');
    this.emit('reconnecting', { attempt, maxAttempts, delayMs: delay });

    await new Promise((resolve) => setTimeout(resolve, delay));
    this.reconnectionManager.recordAttempt();

    try {
      await this.createConnection();
    } catch (error) {
      this.logger.error('Reconnection failed', error);
      this.attemptReconnect();
    }
  }

  /**
   * Start keepalive interval
   */
  private startKeepalive(): void {
    this.stopKeepalive();
    // Send keepalive every 15 seconds (server timeout is 20s)
    this.keepaliveInterval = setInterval(() => {
      this.sendKeepalive();
    }, 15000);
  }

  /**
   * Stop keepalive interval
   */
  private stopKeepalive(): void {
    if (this.keepaliveInterval) {
      clearInterval(this.keepaliveInterval);
      this.keepaliveInterval = null;
    }
  }

  /**
   * Update connection state
   */
  private setState(newState: ConnectionState): void {
    if (this.state === newState) return;

    const previousState = this.state;
    this.state = newState;
    this.emit('state-change', { state: newState, previousState });
  }
}
