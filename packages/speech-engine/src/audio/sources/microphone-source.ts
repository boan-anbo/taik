/**
 * Microphone audio source
 * Captures audio from the device microphone (browser only)
 */

import type { AudioSourceConfig, MicrophoneOptions } from '../../types/audio.js';
import type { RuntimeAdapter, AudioStream } from '../../runtime/adapter.js';
import { BaseAudioSource } from './base-source.js';
import { AudioError, UnsupportedError } from '../../utils/errors.js';

/**
 * Microphone source - captures audio from device microphone
 * Only supported in browser environments
 */
export class MicrophoneSource extends BaseAudioSource {
  private options: MicrophoneOptions;
  private adapter: RuntimeAdapter;
  private audioStream: AudioStream | null = null;
  private chunkDurationMs: number;

  constructor(adapter: RuntimeAdapter, options: MicrophoneOptions = {}) {
    const sampleRate = options.sampleRate ?? 16000;

    super({
      sampleRate,
      channels: 1,
      format: 'pcm_s16le',
    });

    this.adapter = adapter;
    this.options = options;
    // Default chunk duration based on sample rate (100ms chunks)
    this.chunkDurationMs = 100;
  }

  async start(): Promise<void> {
    if (this.state !== 'idle' && this.state !== 'stopped') {
      throw new AudioError('Cannot start: source is not in idle or stopped state');
    }

    if (!this.adapter.audio.isSupported()) {
      throw new UnsupportedError('Microphone capture', this.adapter.type);
    }

    this.setState('starting');
    this.startTime = Date.now();

    try {
      this.audioStream = await this.adapter.audio.captureFromMicrophone(this.options);

      this.audioStream.onData((data: ArrayBuffer) => {
        if (this.state !== 'active') return;

        const chunk = {
          data,
          timestamp: this.getElapsedMs(),
          durationMs: this.chunkDurationMs,
        };

        this.emitChunk(chunk);
      });

      this.audioStream.onError((error: Error) => {
        this.emitError(error);
        this.setState('error');
      });

      this.setState('active');
    } catch (error) {
      this.setState('error');
      throw error instanceof Error
        ? error
        : new AudioError('Failed to start microphone');
    }
  }

  async stop(): Promise<void> {
    if (this.state !== 'active' && this.state !== 'starting') {
      return;
    }

    this.setState('stopping');

    if (this.audioStream) {
      this.audioStream.stop();
      this.audioStream = null;
    }

    this.setState('stopped');
  }

  dispose(): void {
    this.stop();
    this.chunkCallbacks.clear();
    this.errorCallbacks.clear();
    this.stateCallbacks.clear();
  }
}
