/**
 * MediaStream audio source
 * Wraps an existing MediaStream for audio capture.
 * Use this when you already have a MediaStream (e.g., from useAudioStreamManager)
 * and want to share it between visualization and transcription.
 */

import type { AudioSourceConfig } from '../../types/audio.js';
import { BaseAudioSource } from './base-source.js';
import { AudioError } from '../../utils/errors.js';

/**
 * Options for MediaStreamSource
 */
export interface MediaStreamSourceOptions {
  /** The MediaStream to use for audio capture */
  stream: MediaStream;
  /** Target sample rate (default: 16000) */
  sampleRate?: number;
  /** Whether to stop the stream tracks when stopped (default: false) */
  stopTracksOnStop?: boolean;
}

/**
 * MediaStreamSource - captures audio from an existing MediaStream
 * Unlike MicrophoneSource, this doesn't create or manage the MediaStream lifecycle.
 * The caller is responsible for creating and cleaning up the MediaStream.
 */
export class MediaStreamSource extends BaseAudioSource {
  private stream: MediaStream;
  private sampleRate: number;
  private stopTracksOnStop: boolean;
  private audioContext: AudioContext | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private gain: GainNode | null = null;
  private chunkDurationMs: number;

  constructor(options: MediaStreamSourceOptions) {
    const sampleRate = options.sampleRate ?? 16000;

    super({
      sampleRate,
      channels: 1,
      format: 'pcm_s16le',
    });

    this.stream = options.stream;
    this.sampleRate = sampleRate;
    this.stopTracksOnStop = options.stopTracksOnStop ?? false;
    // Default chunk duration (100ms chunks at 4096 samples)
    this.chunkDurationMs = 100;
  }

  /**
   * Get the underlying MediaStream
   * Useful for connecting to other consumers (e.g., visualization)
   */
  getMediaStream(): MediaStream {
    return this.stream;
  }

  async start(): Promise<void> {
    if (this.state !== 'idle' && this.state !== 'stopped') {
      throw new AudioError('Cannot start: source is not in idle or stopped state');
    }

    // Validate the stream has audio tracks
    const audioTracks = this.stream.getAudioTracks();
    if (audioTracks.length === 0) {
      throw new AudioError('MediaStream has no audio tracks');
    }

    const track = audioTracks[0];
    if (track && track.readyState === 'ended') {
      throw new AudioError('MediaStream audio track has ended');
    }

    this.setState('starting');
    this.startTime = Date.now();

    try {
      // Create AudioContext at the target sample rate
      this.audioContext = new AudioContext({ sampleRate: this.sampleRate });

      // Attempt to resume in environments with autoplay policies.
      // If resume fails, audio callbacks will not fire (no chunks → STT timeout).
      if (this.audioContext.state === 'suspended') {
        try {
          await this.audioContext.resume();
        } catch (err) {
          this.cleanup();
          throw new AudioError(
            `USER_GESTURE_REQUIRED: Audio is blocked until you interact with the window (click or key press). ` +
              `Original error: ${formatErrorForMessage(err)}`
          );
        }
      }

      if (this.audioContext.state === 'suspended') {
        this.cleanup();
        throw new AudioError(
          'USER_GESTURE_REQUIRED: Audio is blocked until you interact with the window (click or key press).'
        );
      }

      this.source = this.audioContext.createMediaStreamSource(this.stream);

      // Use ScriptProcessorNode for audio processing
      // Note: This is deprecated but AudioWorklet requires more setup
      const bufferSize = 4096;
      this.processor = this.audioContext.createScriptProcessor(bufferSize, 1, 1);

      this.processor.onaudioprocess = (event) => {
        if (this.state !== 'active') return;

        const inputData = event.inputBuffer.getChannelData(0);
        const pcm16 = this.float32ToPcm16(inputData);

        const chunk = {
          data: this.toArrayBuffer(pcm16.buffer),
          timestamp: this.getElapsedMs(),
          durationMs: this.chunkDurationMs,
        };

        this.emitChunk(chunk);
      };

      this.source.connect(this.processor);

      // Keep the graph alive without audible output.
      // ScriptProcessor requires a connection chain to destination to receive callbacks.
      this.gain = this.audioContext.createGain();
      this.gain.gain.value = 0;
      this.processor.connect(this.gain);
      this.gain.connect(this.audioContext.destination);

      // Listen for track ended
      audioTracks.forEach(track => {
        track.addEventListener('ended', () => {
          if (this.state === 'active') {
            this.emitError(new AudioError('Audio track ended unexpectedly'));
            this.setState('error');
          }
        });
      });

      this.setState('active');
    } catch (error) {
      this.setState('error');
      this.cleanup();
      throw error instanceof Error
        ? error
        : new AudioError('Failed to start MediaStream source');
    }
  }

  async stop(): Promise<void> {
    if (this.state !== 'active' && this.state !== 'starting') {
      return;
    }

    this.setState('stopping');
    this.cleanup();
    this.setState('stopped');
  }

  dispose(): void {
    this.stop();
    this.chunkCallbacks.clear();
    this.errorCallbacks.clear();
    this.stateCallbacks.clear();
  }

  private cleanup(): void {
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }

    if (this.gain) {
      this.gain.disconnect();
      this.gain = null;
    }

    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }

    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }

    // Only stop tracks if configured to do so
    if (this.stopTracksOnStop) {
      this.stream.getTracks().forEach(track => track.stop());
    }
  }

  private float32ToPcm16(float32: Float32Array): Int16Array {
    const pcm16 = new Int16Array(float32.length);
    for (let i = 0; i < float32.length; i++) {
      const s = Math.max(-1, Math.min(1, float32[i]!));
      pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return pcm16;
  }

  private toArrayBuffer(buffer: ArrayBufferLike): ArrayBuffer {
    if (buffer instanceof ArrayBuffer) {
      return buffer;
    }
    // Handle SharedArrayBuffer by copying
    const copy = new ArrayBuffer(buffer.byteLength);
    new Uint8Array(copy).set(new Uint8Array(buffer));
    return copy;
  }
}

function formatErrorForMessage(err: unknown): string {
  if (err instanceof Error) {
    return `${err.name}: ${err.message}`;
  }
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}
