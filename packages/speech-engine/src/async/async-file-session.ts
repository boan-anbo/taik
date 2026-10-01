/**
 * Async File Session - Simplified API for async file transcription
 *
 * Provides an event-based interface for async file transcription,
 * matching the pattern of the streaming FileSession but using REST API.
 */

import { SonioxAsyncClient } from './soniox-async-client.js';
import {
  type AsyncClientConfig,
  type CreateTranscriptionOptions,
  type AsyncTranscriptionResult,
  type AsyncTranscriptionProgress,
  type TranscriptToken,
  AsyncTranscriptionError,
} from './types.js';

// ============================================================================
// Event Types
// ============================================================================

export interface AsyncSessionEventMap {
  /** Emitted when upload starts */
  'upload-start': { fileName: string };

  /** Emitted when upload completes */
  'upload-complete': { fileId: string };

  /** Emitted when transcription job is created */
  'job-created': { transcriptionId: string };

  /** Emitted on progress updates */
  progress: AsyncTranscriptionProgress;

  /** Emitted when transcription completes */
  complete: AsyncTranscriptionResult;

  /** Emitted on error */
  error: { error: Error; phase: 'upload' | 'transcription' | 'polling' };
}

type EventCallback<K extends keyof AsyncSessionEventMap> = (
  data: AsyncSessionEventMap[K]
) => void;

// ============================================================================
// AsyncFileSession Class
// ============================================================================

/**
 * AsyncFileSession - Event-based async file transcription
 *
 * @example
 * ```typescript
 * const session = new AsyncFileSession({
 *   apiKey: 'your-api-key',
 * });
 *
 * session.on('progress', (p) => console.log(`${p.status}: ${p.progress}%`));
 * session.on('complete', (result) => console.log(result.text));
 * session.on('error', (e) => console.error(e.error));
 *
 * // Transcribe from URL
 * session.transcribeUrl('https://example.com/audio.mp3');
 *
 * // Or from file
 * session.transcribeFile(fileBuffer, 'audio.mp3');
 * ```
 */
export class AsyncFileSession {
  private client: SonioxAsyncClient;
  private listeners = new Map<string, Set<EventCallback<keyof AsyncSessionEventMap>>>();
  private aborted = false;
  private currentTranscriptionId: string | null = null;

  constructor(config: AsyncClientConfig) {
    this.client = new SonioxAsyncClient(config);
  }

  // ============================================================================
  // Event Emitter
  // ============================================================================

  /**
   * Subscribe to an event
   */
  on<K extends keyof AsyncSessionEventMap>(
    event: K,
    callback: EventCallback<K>
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback as EventCallback<keyof AsyncSessionEventMap>);

    return () => {
      this.listeners.get(event)?.delete(callback as EventCallback<keyof AsyncSessionEventMap>);
    };
  }

  /**
   * Emit an event
   */
  private emit<K extends keyof AsyncSessionEventMap>(
    event: K,
    data: AsyncSessionEventMap[K]
  ): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${event} listener:`, error);
        }
      });
    }
  }

  // ============================================================================
  // Transcription Methods
  // ============================================================================

  /**
   * Transcribe an audio file from URL
   */
  async transcribeUrl(
    audioUrl: string,
    options?: Omit<CreateTranscriptionOptions, 'audioUrl' | 'fileId'>
  ): Promise<AsyncTranscriptionResult> {
    this.aborted = false;

    try {
      const result = await this.client.transcribeUrl(
        audioUrl,
        options,
        (progress) => {
          if (this.aborted) return;

          if (progress.transcriptionId && !this.currentTranscriptionId) {
            this.currentTranscriptionId = progress.transcriptionId;
            this.emit('job-created', { transcriptionId: progress.transcriptionId });
          }

          this.emit('progress', progress);
        }
      );

      if (this.aborted) {
        throw new AsyncTranscriptionError('Transcription aborted', 'aborted', 499);
      }

      this.emit('complete', result);
      return result;
    } catch (error) {
      if (!this.aborted) {
        this.emit('error', {
          error: error as Error,
          phase: 'transcription',
        });
      }
      throw error;
    } finally {
      this.currentTranscriptionId = null;
    }
  }

  /**
   * Upload and transcribe a file
   */
  async transcribeFile(
    fileData: ArrayBuffer | Blob,
    fileName: string,
    options?: Omit<CreateTranscriptionOptions, 'audioUrl' | 'fileId'>
  ): Promise<AsyncTranscriptionResult> {
    this.aborted = false;

    try {
      this.emit('upload-start', { fileName });

      // Upload file
      const fileId = await this.client.uploadFile(fileData, fileName);

      if (this.aborted) {
        throw new AsyncTranscriptionError('Transcription aborted', 'aborted', 499);
      }

      this.emit('upload-complete', { fileId });

      // Create transcription
      const transcription = await this.client.createTranscription({
        ...options,
        fileId,
      });

      this.currentTranscriptionId = transcription.id;
      this.emit('job-created', { transcriptionId: transcription.id });
      this.emit('progress', {
        status: transcription.status,
        progress: 10,
        transcriptionId: transcription.id,
      });

      // Wait for completion
      const completed = await this.client.waitForCompletion(
        transcription.id,
        (progress) => {
          if (this.aborted) return;
          this.emit('progress', {
            ...progress,
            progress: Math.min(100, 10 + progress.progress * 0.9),
          });
        }
      );

      if (this.aborted) {
        throw new AsyncTranscriptionError('Transcription aborted', 'aborted', 499);
      }

      // Get transcript
      const transcript = await this.client.getTranscript(transcription.id);

      const result: AsyncTranscriptionResult = {
        id: transcription.id,
        text: transcript.text,
        tokens: transcript.tokens,
        audioDurationMs: completed.audioDurationMs || 0,
        model: completed.model,
        filename: completed.filename,
      };

      this.emit('complete', result);
      return result;
    } catch (error) {
      if (!this.aborted) {
        const phase = (error as AsyncTranscriptionError).errorType === 'upload_failed'
          ? 'upload'
          : 'transcription';
        this.emit('error', {
          error: error as Error,
          phase,
        });
      }
      throw error;
    } finally {
      this.currentTranscriptionId = null;
    }
  }

  /**
   * Abort the current transcription
   */
  abort(): void {
    this.aborted = true;
    // Note: The Soniox API doesn't support cancelling transcriptions,
    // so we just stop polling and ignore further results
  }

  /**
   * Get the current transcription ID (if any)
   */
  getCurrentTranscriptionId(): string | null {
    return this.currentTranscriptionId;
  }

  /**
   * Remove all event listeners
   */
  dispose(): void {
    this.aborted = true;
    this.listeners.clear();
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Transcribe a file from URL (one-shot)
 *
 * @example
 * ```typescript
 * const result = await transcribeUrlAsync(
 *   { apiKey: 'your-key' },
 *   'https://example.com/audio.mp3',
 *   { enableSpeakerDiarization: true }
 * );
 * console.log(result.text);
 * ```
 */
export async function transcribeUrlAsync(
  config: AsyncClientConfig,
  audioUrl: string,
  options?: Omit<CreateTranscriptionOptions, 'audioUrl' | 'fileId'>,
  onProgress?: (progress: AsyncTranscriptionProgress) => void
): Promise<AsyncTranscriptionResult> {
  const client = new SonioxAsyncClient(config);
  return client.transcribeUrl(audioUrl, options, onProgress);
}

/**
 * Upload and transcribe a file (one-shot)
 *
 * @example
 * ```typescript
 * const result = await transcribeFileAsync(
 *   { apiKey: 'your-key' },
 *   fileBuffer,
 *   'recording.mp3'
 * );
 * console.log(result.text);
 * ```
 */
export async function transcribeFileAsync(
  config: AsyncClientConfig,
  fileData: ArrayBuffer | Blob,
  fileName: string,
  options?: Omit<CreateTranscriptionOptions, 'audioUrl' | 'fileId'>,
  onProgress?: (progress: AsyncTranscriptionProgress) => void
): Promise<AsyncTranscriptionResult> {
  const client = new SonioxAsyncClient(config);
  return client.transcribeFile(fileData, fileName, options, onProgress);
}
