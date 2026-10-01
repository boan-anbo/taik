/**
 * Soniox Async Transcription Client
 *
 * REST API client for async file transcription via Soniox.
 * Supports file upload, transcription creation, status polling, and transcript retrieval.
 */

import {
  type AsyncClientConfig,
  type CreateTranscriptionOptions,
  type FileUploadResponse,
  type Transcription,
  type TranscriptResult,
  type AsyncTranscriptionResult,
  type ProgressCallback,
  type SonioxApiError,
  AsyncTranscriptionError,
  DEFAULT_ASYNC_CONFIG,
} from './types.js';

/**
 * Convert snake_case API response to camelCase
 */
function toCamelCase<T>(obj: Record<string, unknown>): T {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[camelKey] = toCamelCase(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      result[camelKey] = value.map((item) =>
        typeof item === 'object' && item !== null
          ? toCamelCase(item as Record<string, unknown>)
          : item
      );
    } else {
      result[camelKey] = value;
    }
  }
  return result as T;
}

/**
 * Convert camelCase to snake_case for API requests
 */
function toSnakeCase(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[snakeKey] = toSnakeCase(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      result[snakeKey] = value.map((item) =>
        typeof item === 'object' && item !== null
          ? toSnakeCase(item as Record<string, unknown>)
          : item
      );
    } else {
      result[snakeKey] = value;
    }
  }
  return result;
}

/**
 * Audio MIME type mapping by file extension
 */
const AUDIO_MIME_TYPES: Record<string, string> = {
  // Common audio formats
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  flac: 'audio/flac',
  ogg: 'audio/ogg',
  webm: 'audio/webm',
  aac: 'audio/aac',
  // Apple formats (M4A is AAC audio in MP4 container)
  m4a: 'audio/mp4',
  // Video formats (may contain audio)
  mp4: 'video/mp4',
  // Less common formats
  opus: 'audio/opus',
  wma: 'audio/x-ms-wma',
  aiff: 'audio/aiff',
  caf: 'audio/x-caf',
};

/**
 * Get MIME type from file name extension
 */
function getMimeTypeFromFileName(fileName: string): string | undefined {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (!ext) return undefined;
  return AUDIO_MIME_TYPES[ext];
}

/**
 * Soniox Async Transcription Client
 *
 * @example
 * ```typescript
 * const client = new SonioxAsyncClient({ apiKey: 'your-api-key' });
 *
 * // Transcribe from URL
 * const result = await client.transcribeUrl(
 *   'https://example.com/audio.mp3',
 *   { enableSpeakerDiarization: true },
 *   (progress) => console.log(`${progress.status}: ${progress.progress}%`)
 * );
 * console.log(result.text);
 *
 * // Or upload and transcribe a file
 * const fileId = await client.uploadFile(fileBuffer, 'audio.mp3');
 * const result2 = await client.transcribeFile(fileId);
 * ```
 */
export class SonioxAsyncClient {
  private readonly config: Required<AsyncClientConfig>;

  constructor(config: AsyncClientConfig) {
    this.config = {
      ...DEFAULT_ASYNC_CONFIG,
      ...config,
    };
  }

  /**
   * Make an authenticated API request
   */
  private async request<T>(
    method: 'GET' | 'POST' | 'DELETE',
    path: string,
    body?: Record<string, unknown> | FormData
  ): Promise<T> {
    const url = `${this.config.baseUrl}${path}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.config.apiKey}`,
    };

    let requestBody: string | FormData | undefined;
    if (body instanceof FormData) {
      requestBody = body;
      // Don't set Content-Type for FormData, let fetch handle it
    } else if (body) {
      headers['Content-Type'] = 'application/json';
      requestBody = JSON.stringify(toSnakeCase(body));
    }

    const response = await fetch(url, {
      method,
      headers,
      body: requestBody,
    });

    const data = await response.json();

    if (!response.ok) {
      const error = toCamelCase<SonioxApiError>(data);
      throw new AsyncTranscriptionError(
        error.message || `API request failed with status ${response.status}`,
        error.errorType || 'unknown_error',
        error.statusCode || response.status,
        error.requestId
      );
    }

    return toCamelCase<T>(data);
  }

  // ============================================================================
  // File Upload
  // ============================================================================

  /**
   * Upload an audio file to Soniox
   *
   * @param fileData - File content as ArrayBuffer, Blob, or Buffer
   * @param fileName - Name to assign to the file
   * @returns File ID for use in transcription
   */
  async uploadFile(
    fileData: ArrayBuffer | Blob,
    fileName: string
  ): Promise<string> {
    const formData = new FormData();

    // Convert to Blob if needed, with proper MIME type
    let blob: Blob;
    const mimeType = getMimeTypeFromFileName(fileName);

    if (fileData instanceof Blob) {
      // If Blob already has a type, use it; otherwise use detected MIME type
      if (fileData.type) {
        blob = fileData;
      } else if (mimeType) {
        blob = new Blob([fileData], { type: mimeType });
      } else {
        blob = fileData;
      }
    } else {
      // ArrayBuffer - wrap in Blob with MIME type from extension
      blob = new Blob([fileData], mimeType ? { type: mimeType } : undefined);
    }

    formData.append('file', blob, fileName);

    const response = await this.request<FileUploadResponse>('POST', '/files', formData);
    console.log('[SonioxAsyncClient] Upload response:', JSON.stringify(response));
    if (!response.id) {
      console.error('[SonioxAsyncClient] No id in upload response:', response);
      throw new AsyncTranscriptionError(
        'Upload succeeded but no file ID returned',
        'upload_failed',
        500
      );
    }
    return response.id;
  }

  // ============================================================================
  // Transcription Management
  // ============================================================================

  /**
   * Create a new transcription job
   *
   * @param options - Transcription options (must include audioUrl or fileId)
   * @returns Created transcription object
   */
  async createTranscription(options: CreateTranscriptionOptions): Promise<Transcription> {
    if (!options.audioUrl && !options.fileId) {
      throw new AsyncTranscriptionError(
        'Either audioUrl or fileId must be provided',
        'invalid_request',
        400
      );
    }

    const body: Record<string, unknown> = {
      model: options.model || this.config.defaultModel,
    };

    if (options.audioUrl) body.audioUrl = options.audioUrl;
    if (options.fileId) body.fileId = options.fileId;
    if (options.languageHints) body.languageHints = options.languageHints;
    if (options.enableSpeakerDiarization !== undefined) {
      body.enableSpeakerDiarization = options.enableSpeakerDiarization;
    }
    if (options.enableLanguageIdentification !== undefined) {
      body.enableLanguageIdentification = options.enableLanguageIdentification;
    }
    if (options.context) body.context = options.context;
    if (options.clientReferenceId) body.clientReferenceId = options.clientReferenceId;
    if (options.webhookUrl) body.webhookUrl = options.webhookUrl;

    return this.request<Transcription>('POST', '/transcriptions', body);
  }

  /**
   * Get transcription status and details
   *
   * @param transcriptionId - Transcription ID
   * @returns Transcription object with current status
   */
  async getTranscription(transcriptionId: string): Promise<Transcription> {
    return this.request<Transcription>('GET', `/transcriptions/${transcriptionId}`);
  }

  /**
   * Get transcript for a completed transcription
   *
   * @param transcriptionId - Transcription ID
   * @returns Transcript with text and tokens
   */
  async getTranscript(transcriptionId: string): Promise<TranscriptResult> {
    return this.request<TranscriptResult>(
      'GET',
      `/transcriptions/${transcriptionId}/transcript`
    );
  }

  /**
   * Delete a transcription
   *
   * @param transcriptionId - Transcription ID to delete
   */
  async deleteTranscription(transcriptionId: string): Promise<void> {
    await this.request<void>('DELETE', `/transcriptions/${transcriptionId}`);
  }

  // ============================================================================
  // High-Level Methods with Polling
  // ============================================================================

  /**
   * Wait for a transcription to complete
   *
   * @param transcriptionId - Transcription ID to wait for
   * @param onProgress - Optional progress callback
   * @returns Completed transcription status
   */
  async waitForCompletion(
    transcriptionId: string,
    onProgress?: ProgressCallback
  ): Promise<Transcription> {
    const startTime = Date.now();
    let pollCount = 0;

    while (true) {
      const transcription = await this.getTranscription(transcriptionId);

      // Estimate progress based on status and poll count
      let progress = 0;
      if (transcription.status === 'queued') {
        progress = Math.min(10, pollCount * 2);
      } else if (transcription.status === 'processing') {
        progress = Math.min(90, 10 + pollCount * 5);
      } else if (transcription.status === 'completed') {
        progress = 100;
      }

      onProgress?.({
        status: transcription.status,
        progress,
        transcriptionId,
        errorMessage: transcription.errorMessage,
      });

      if (transcription.status === 'completed') {
        return transcription;
      }

      if (transcription.status === 'error') {
        throw new AsyncTranscriptionError(
          transcription.errorMessage || 'Transcription failed',
          transcription.errorType || 'transcription_failed',
          500
        );
      }

      // Check timeout
      if (Date.now() - startTime > this.config.maxPollingDurationMs) {
        throw new AsyncTranscriptionError(
          `Transcription timed out after ${this.config.maxPollingDurationMs}ms`,
          'timeout',
          408
        );
      }

      // Wait before next poll
      await new Promise((resolve) =>
        setTimeout(resolve, this.config.pollingIntervalMs)
      );
      pollCount++;
    }
  }

  /**
   * Transcribe an audio file from URL (with automatic polling)
   *
   * @param audioUrl - Public URL of the audio file
   * @param options - Additional transcription options
   * @param onProgress - Optional progress callback
   * @returns Complete transcription result
   */
  async transcribeUrl(
    audioUrl: string,
    options?: Omit<CreateTranscriptionOptions, 'audioUrl' | 'fileId'>,
    onProgress?: ProgressCallback
  ): Promise<AsyncTranscriptionResult> {
    // Create transcription job
    const transcription = await this.createTranscription({
      ...options,
      audioUrl,
    });

    onProgress?.({
      status: transcription.status,
      progress: 5,
      transcriptionId: transcription.id,
    });

    // Wait for completion
    const completed = await this.waitForCompletion(transcription.id, onProgress);

    // Get transcript
    const transcript = await this.getTranscript(transcription.id);

    return {
      id: transcription.id,
      text: transcript.text,
      tokens: transcript.tokens,
      audioDurationMs: completed.audioDurationMs || 0,
      model: completed.model,
      filename: completed.filename,
    };
  }

  /**
   * Upload and transcribe a file (with automatic polling)
   *
   * @param fileData - File content
   * @param fileName - File name
   * @param options - Additional transcription options
   * @param onProgress - Optional progress callback
   * @returns Complete transcription result
   */
  async transcribeFile(
    fileData: ArrayBuffer | Blob,
    fileName: string,
    options?: Omit<CreateTranscriptionOptions, 'audioUrl' | 'fileId'>,
    onProgress?: ProgressCallback
  ): Promise<AsyncTranscriptionResult> {
    // Upload file
    onProgress?.({
      status: 'queued',
      progress: 0,
      transcriptionId: '',
    });

    const fileId = await this.uploadFile(fileData, fileName);

    onProgress?.({
      status: 'queued',
      progress: 5,
      transcriptionId: '',
    });

    // Create transcription job
    const transcription = await this.createTranscription({
      ...options,
      fileId,
    });

    onProgress?.({
      status: transcription.status,
      progress: 10,
      transcriptionId: transcription.id,
    });

    // Wait for completion
    const completed = await this.waitForCompletion(transcription.id, (p) => {
      // Adjust progress to account for upload phase
      onProgress?.({
        ...p,
        progress: Math.min(100, 10 + p.progress * 0.9),
      });
    });

    // Get transcript
    const transcript = await this.getTranscript(transcription.id);

    return {
      id: transcription.id,
      text: transcript.text,
      tokens: transcript.tokens,
      audioDurationMs: completed.audioDurationMs || 0,
      model: completed.model,
      filename: completed.filename,
    };
  }
}
