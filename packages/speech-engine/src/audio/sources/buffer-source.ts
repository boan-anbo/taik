/**
 * Buffer audio source
 * Streams audio from an in-memory buffer
 */

import type { AudioSourceConfig, BufferSourceOptions } from '../../types/audio.js';
import { BaseAudioSource } from './base-source.js';
import { AudioError } from '../../utils/errors.js';

/**
 * Buffer source - streams audio from an ArrayBuffer
 * Useful for testing and custom audio pipelines
 */
export class BufferSource extends BaseAudioSource {
  private buffer: ArrayBuffer;
  private simulateRealtime: boolean;
  private chunkDurationMs: number;
  private aborted = false;

  constructor(options: BufferSourceOptions) {
    super({
      sampleRate: options.sampleRate,
      channels: options.channels ?? 1,
      format: options.format,
    });

    this.buffer = options.buffer;
    this.simulateRealtime = options.simulateRealtime ?? false;
    this.chunkDurationMs = options.chunkDurationMs ?? 100;
  }

  async start(): Promise<void> {
    if (this.state !== 'idle' && this.state !== 'stopped') {
      throw new AudioError('Cannot start: source is not in idle or stopped state');
    }

    this.setState('starting');
    this.startTime = Date.now();
    this.aborted = false;

    try {
      if (this.simulateRealtime) {
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
          : new AudioError('Failed to stream buffer');
      }
    }
  }

  /**
   * Stream buffer as fast as possible
   */
  private async streamFast(): Promise<void> {
    this.setState('active');

    const CHUNK_SIZE = 32768; // 32KB chunks
    let offset = 0;

    while (offset < this.buffer.byteLength) {
      if (this.aborted) break;

      const end = Math.min(offset + CHUNK_SIZE, this.buffer.byteLength);
      const chunk = this.buffer.slice(offset, end);

      this.emitChunk({
        data: chunk,
        timestamp: offset,
        durationMs: 0,
      });

      offset = end;

      // Yield to event loop
      await Promise.resolve();
    }
  }

  /**
   * Stream buffer simulating real-time
   */
  private async streamRealtime(): Promise<void> {
    this.setState('active');

    const bytesPerMs = (this.config.sampleRate * 2 * this.config.channels) / 1000;
    const bytesPerChunk = Math.floor(bytesPerMs * this.chunkDurationMs);

    let offset = 0;
    let timestamp = 0;

    while (offset < this.buffer.byteLength) {
      if (this.aborted) break;

      const chunkSize = Math.min(bytesPerChunk, this.buffer.byteLength - offset);
      const chunk = this.buffer.slice(offset, offset + chunkSize);
      const duration = chunkSize / bytesPerMs;

      this.emitChunk({
        data: chunk,
        timestamp,
        durationMs: duration,
      });

      offset += chunkSize;
      timestamp += duration;

      // Wait to simulate real-time
      await this.sleep(this.chunkDurationMs);
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

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
