/**
 * File audio source
 * Streams audio from a file (local or URL)
 */

import type { AudioSourceConfig, FileSourceOptions } from '../../types/audio.js';
import type { RuntimeAdapter } from '../../runtime/adapter.js';
import { BaseAudioSource } from './base-source.js';
import { AudioError } from '../../utils/errors.js';

/**
 * File source - streams audio from a file
 * Supports local files (Node/Bun) and URLs (all runtimes)
 */
export class FileSource extends BaseAudioSource {
  private options: FileSourceOptions;
  private adapter: RuntimeAdapter;
  private aborted = false;

  constructor(adapter: RuntimeAdapter, options: FileSourceOptions) {
    // For file sources, we use 'auto' format and let Soniox detect
    super({
      sampleRate: 16000, // Will be overridden by actual file
      channels: 1,
      format: 'auto',
    });

    this.adapter = adapter;
    this.options = {
      simulateRealtime: false,
      chunkDurationMs: 100,
      ...options,
    };
  }

  async start(): Promise<void> {
    if (this.state !== 'idle' && this.state !== 'stopped') {
      throw new AudioError('Cannot start: source is not in idle or stopped state');
    }

    this.setState('starting');
    this.startTime = Date.now();
    this.aborted = false;

    try {
      if (this.options.simulateRealtime) {
        await this.streamRealtime();
      } else {
        await this.streamFast();
      }

      if (!this.aborted) {
        this.setState('stopped');
      }
    } catch (error) {
      if (!this.aborted) {
        this.setState('error');
        throw error instanceof Error
          ? error
          : new AudioError('Failed to read file');
      }
    }
  }

  /**
   * Stream file as fast as possible (for batch transcription)
   */
  private async streamFast(): Promise<void> {
    this.setState('active');

    const CHUNK_SIZE = 32768; // 32KB chunks
    let offset = 0;

    for await (const chunk of this.adapter.file.createReadStream(this.options.path)) {
      if (this.aborted) break;

      // Split into smaller chunks if needed
      let position = 0;
      while (position < chunk.byteLength) {
        if (this.aborted) break;

        const end = Math.min(position + CHUNK_SIZE, chunk.byteLength);
        const slice = chunk.slice(position, end);

        this.emitChunk({
          data: slice,
          timestamp: offset,
          durationMs: 0, // Unknown for fast streaming
        });

        position = end;
        offset += slice.byteLength;
      }
    }
  }

  /**
   * Stream file simulating real-time (for testing)
   */
  private async streamRealtime(): Promise<void> {
    this.setState('active');

    const chunkDurationMs = this.options.chunkDurationMs ?? 100;
    const bytesPerMs = (this.config.sampleRate * 2) / 1000; // 16-bit PCM
    const bytesPerChunk = Math.floor(bytesPerMs * chunkDurationMs);

    let buffer = new ArrayBuffer(0);
    let timestamp = 0;

    for await (const chunk of this.adapter.file.createReadStream(this.options.path)) {
      if (this.aborted) break;

      // Append to buffer
      buffer = this.concatBuffers(buffer, chunk);

      // Emit chunks at simulated real-time pace
      while (buffer.byteLength >= bytesPerChunk) {
        if (this.aborted) break;

        const chunkData = buffer.slice(0, bytesPerChunk);
        buffer = buffer.slice(bytesPerChunk);

        this.emitChunk({
          data: chunkData,
          timestamp,
          durationMs: chunkDurationMs,
        });

        timestamp += chunkDurationMs;

        // Wait to simulate real-time
        await this.sleep(chunkDurationMs);
      }
    }

    // Emit remaining data
    if (buffer.byteLength > 0 && !this.aborted) {
      const remainingDuration = (buffer.byteLength / bytesPerMs);
      this.emitChunk({
        data: buffer,
        timestamp,
        durationMs: remainingDuration,
      });
    }
  }

  async stop(): Promise<void> {
    this.aborted = true;
    this.setState('stopped');
  }

  dispose(): void {
    this.aborted = true;
    this.chunkCallbacks.clear();
    this.errorCallbacks.clear();
    this.stateCallbacks.clear();
  }

  private concatBuffers(a: ArrayBuffer, b: ArrayBuffer): ArrayBuffer {
    const result = new Uint8Array(a.byteLength + b.byteLength);
    result.set(new Uint8Array(a), 0);
    result.set(new Uint8Array(b), a.byteLength);
    return result.buffer;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
