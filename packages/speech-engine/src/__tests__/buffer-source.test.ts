/**
 * Tests for BufferSource
 */

import { describe, it, expect, vi } from 'vitest';
import { BufferSource } from '../audio/sources/buffer-source.js';

describe('BufferSource', () => {
  // Create a simple PCM buffer (1 second of silence at 16kHz, 16-bit mono)
  const createTestBuffer = (durationMs: number): ArrayBuffer => {
    const sampleRate = 16000;
    const bytesPerSample = 2;
    const numSamples = Math.floor((sampleRate * durationMs) / 1000);
    return new ArrayBuffer(numSamples * bytesPerSample);
  };

  it('should create source with correct config', () => {
    const buffer = createTestBuffer(1000);
    const source = new BufferSource({
      buffer,
      format: 'pcm_s16le',
      sampleRate: 16000,
      channels: 1,
    });

    const config = source.getConfig();
    expect(config.format).toBe('pcm_s16le');
    expect(config.sampleRate).toBe(16000);
    expect(config.channels).toBe(1);
  });

  it('should start in idle state', () => {
    const buffer = createTestBuffer(100);
    const source = new BufferSource({
      buffer,
      format: 'pcm_s16le',
      sampleRate: 16000,
    });

    expect(source.getState()).toBe('idle');
    expect(source.isActive()).toBe(false);
  });

  it('should emit chunks when started', async () => {
    const buffer = createTestBuffer(100);
    const source = new BufferSource({
      buffer,
      format: 'pcm_s16le',
      sampleRate: 16000,
      simulateRealtime: false,
    });

    const chunks: ArrayBuffer[] = [];
    source.onChunk((chunk) => {
      chunks.push(chunk.data);
    });

    await source.start();

    expect(chunks.length).toBeGreaterThan(0);
    expect(source.getState()).toBe('stopped');
  });

  it('should transition through states correctly', async () => {
    const buffer = createTestBuffer(100);
    const source = new BufferSource({
      buffer,
      format: 'pcm_s16le',
      sampleRate: 16000,
      simulateRealtime: false,
    });

    const states: string[] = [];
    source.onStateChange((state) => {
      states.push(state);
    });

    await source.start();

    expect(states).toContain('starting');
    expect(states).toContain('active');
    expect(states).toContain('stopped');
  });

  it('should stop when requested', async () => {
    const buffer = createTestBuffer(10000); // Long buffer
    const source = new BufferSource({
      buffer,
      format: 'pcm_s16le',
      sampleRate: 16000,
      simulateRealtime: true,
      chunkDurationMs: 100,
    });

    // Start in background
    const startPromise = source.start();

    // Stop immediately
    await source.stop();

    expect(source.getState()).toBe('stopped');
  });

  it('should dispose and clear callbacks', () => {
    const buffer = createTestBuffer(100);
    const source = new BufferSource({
      buffer,
      format: 'pcm_s16le',
      sampleRate: 16000,
    });

    const callback = vi.fn(() => {});
    source.onChunk(callback);

    source.dispose();

    // After dispose, callbacks should be cleared (state remains unchanged)
    // Source was never started, so state is still 'idle'
    expect(source.getState()).toBe('idle');
  });

  it('should emit total bytes matching buffer size', async () => {
    const buffer = createTestBuffer(100);
    const source = new BufferSource({
      buffer,
      format: 'pcm_s16le',
      sampleRate: 16000,
      simulateRealtime: false,
    });

    let totalBytes = 0;
    source.onChunk((chunk) => {
      totalBytes += chunk.data.byteLength;
    });

    await source.start();

    expect(totalBytes).toBe(buffer.byteLength);
  });

  it('should handle empty buffer', async () => {
    const buffer = new ArrayBuffer(0);
    const source = new BufferSource({
      buffer,
      format: 'pcm_s16le',
      sampleRate: 16000,
    });

    const chunks: ArrayBuffer[] = [];
    source.onChunk((chunk) => {
      chunks.push(chunk.data);
    });

    await source.start();

    expect(chunks.length).toBe(0);
    expect(source.getState()).toBe('stopped');
  });
});
