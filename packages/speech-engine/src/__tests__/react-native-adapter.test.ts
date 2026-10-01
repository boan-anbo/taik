/**
 * Tests for React Native adapter
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  ReactNativeAdapter,
  setNativeAudioModule,
  type NativeAudioCaptureModule,
} from '../runtime/react-native-adapter.js';
import { UnsupportedError, AudioError } from '../utils/errors.js';

describe('ReactNativeAdapter', () => {
  let adapter: ReactNativeAdapter;

  beforeEach(() => {
    adapter = new ReactNativeAdapter();
  });

  describe('type property', () => {
    it('should have type "react-native"', () => {
      expect(adapter.type).toBe('react-native');
    });
  });

  describe('websocket adapter', () => {
    it('should provide a websocket adapter', () => {
      expect(adapter.websocket).toBeDefined();
      expect(adapter.websocket.create).toBeInstanceOf(Function);
    });
  });

  describe('audio adapter', () => {
    it('should provide an audio adapter', () => {
      expect(adapter.audio).toBeDefined();
      expect(adapter.audio.isSupported).toBeInstanceOf(Function);
      expect(adapter.audio.captureFromMicrophone).toBeInstanceOf(Function);
    });

    describe('without native module', () => {
      beforeEach(() => {
        // Reset native module by setting to a mock and then to something that indicates not registered
        setNativeAudioModule(null as unknown as NativeAudioCaptureModule);
      });

      it('should report not supported', () => {
        const adapter = new ReactNativeAdapter();
        expect(adapter.audio.isSupported()).toBe(false);
      });

      it('should throw UnsupportedError when capturing', async () => {
        const adapter = new ReactNativeAdapter();
        await expect(adapter.audio.captureFromMicrophone({})).rejects.toThrow(UnsupportedError);
      });
    });
  });

  describe('file adapter', () => {
    it('should provide a file adapter', () => {
      expect(adapter.file).toBeDefined();
      expect(adapter.file.readFile).toBeInstanceOf(Function);
      expect(adapter.file.createReadStream).toBeInstanceOf(Function);
      expect(adapter.file.exists).toBeInstanceOf(Function);
    });

    it('should throw UnsupportedError for local file paths', async () => {
      await expect(adapter.file.readFile('/local/path/file.wav')).rejects.toThrow(UnsupportedError);
    });

    it('should return false for local path exists check', async () => {
      const exists = await adapter.file.exists('/local/path/file.wav');
      expect(exists).toBe(false);
    });
  });
});

describe('setNativeAudioModule', () => {
  let mockModule: NativeAudioCaptureModule;
  let mockChunkCallback: ((event: { sessionId: string; data: string; timestamp: number }) => void) | null = null;
  let mockErrorCallback: ((event: { sessionId: string; error: string }) => void) | null = null;

  beforeEach(() => {
    mockModule = {
      startCapture: vi.fn().mockResolvedValue('test-session-123'),
      stopCapture: vi.fn().mockResolvedValue(undefined),
      addListener: vi.fn().mockImplementation((eventName, callback) => {
        if (eventName === 'onAudioChunk') {
          mockChunkCallback = callback;
        } else if (eventName === 'onAudioError') {
          mockErrorCallback = callback;
        }
        return { remove: vi.fn() };
      }),
    };
  });

  afterEach(() => {
    // Reset native module
    setNativeAudioModule(null as unknown as NativeAudioCaptureModule);
    mockChunkCallback = null;
    mockErrorCallback = null;
  });

  it('should register native module', () => {
    setNativeAudioModule(mockModule);
    const adapter = new ReactNativeAdapter();
    expect(adapter.audio.isSupported()).toBe(true);
  });

  it('should enable audio capture after registration', async () => {
    setNativeAudioModule(mockModule);
    const adapter = new ReactNativeAdapter();

    const stream = await adapter.audio.captureFromMicrophone({
      sampleRate: 16000,
      echoCancellation: true,
      noiseSuppression: true,
    });

    expect(stream).toBeDefined();
    expect(mockModule.startCapture).toHaveBeenCalledWith({
      sampleRate: 16000,
      channels: 1,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    });
  });

  it('should handle audio chunks from native module', async () => {
    setNativeAudioModule(mockModule);
    const adapter = new ReactNativeAdapter();

    const stream = await adapter.audio.captureFromMicrophone({});

    const receivedChunks: ArrayBuffer[] = [];
    stream.onData((chunk) => {
      receivedChunks.push(chunk);
    });

    // Simulate native module sending audio chunk (base64 encoded)
    const testData = new Uint8Array([1, 2, 3, 4, 5]);
    const base64Data = btoa(String.fromCharCode(...testData));

    if (mockChunkCallback) {
      mockChunkCallback({
        sessionId: 'test-session-123',
        data: base64Data,
        timestamp: Date.now(),
      });
    }

    expect(receivedChunks.length).toBe(1);
    expect(new Uint8Array(receivedChunks[0])).toEqual(testData);
  });

  it('should handle errors from native module', async () => {
    setNativeAudioModule(mockModule);
    const adapter = new ReactNativeAdapter();

    const stream = await adapter.audio.captureFromMicrophone({});

    const receivedErrors: Error[] = [];
    stream.onError((error) => {
      receivedErrors.push(error);
    });

    // Simulate native module sending error
    if (mockErrorCallback) {
      mockErrorCallback({
        sessionId: 'test-session-123',
        error: 'Microphone permission denied',
      });
    }

    expect(receivedErrors.length).toBe(1);
    expect(receivedErrors[0]).toBeInstanceOf(AudioError);
    expect(receivedErrors[0].message).toBe('Microphone permission denied');
  });

  it('should stop capture and cleanup subscriptions', async () => {
    setNativeAudioModule(mockModule);
    const adapter = new ReactNativeAdapter();

    const stream = await adapter.audio.captureFromMicrophone({});

    stream.stop();

    expect(mockModule.stopCapture).toHaveBeenCalledWith('test-session-123');
  });

  it('should filter chunks by session ID', async () => {
    setNativeAudioModule(mockModule);
    const adapter = new ReactNativeAdapter();

    const stream = await adapter.audio.captureFromMicrophone({});

    const receivedChunks: ArrayBuffer[] = [];
    stream.onData((chunk) => {
      receivedChunks.push(chunk);
    });

    // Send chunk for different session
    const testData = new Uint8Array([1, 2, 3]);
    const base64Data = btoa(String.fromCharCode(...testData));

    if (mockChunkCallback) {
      mockChunkCallback({
        sessionId: 'different-session',
        data: base64Data,
        timestamp: Date.now(),
      });
    }

    // Should not receive chunk for different session
    expect(receivedChunks.length).toBe(0);
  });
});

describe('ReactNativeAdapter file operations', () => {
  let adapter: ReactNativeAdapter;

  beforeEach(() => {
    adapter = new ReactNativeAdapter();
  });

  it('should reject createReadStream for local files', async () => {
    const generator = adapter.file.createReadStream('/local/file.wav');
    await expect(generator.next()).rejects.toThrow(UnsupportedError);
  });

  it('should handle HTTP URLs in readFile', async () => {
    // Mock fetch globally
    const mockResponse = new ArrayBuffer(10);
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      arrayBuffer: () => Promise.resolve(mockResponse),
    } as Response);

    const result = await adapter.file.readFile('https://example.com/audio.wav');
    expect(result).toBe(mockResponse);
  });

  it('should throw on HTTP error', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    } as Response);

    await expect(adapter.file.readFile('https://example.com/audio.wav')).rejects.toThrow('Failed to fetch file: 404 Not Found');
  });

  it('should check URL existence with HEAD request', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
    } as Response);

    const exists = await adapter.file.exists('https://example.com/audio.wav');
    expect(exists).toBe(true);
    expect(fetch).toHaveBeenCalledWith('https://example.com/audio.wav', { method: 'HEAD' });
  });
});
