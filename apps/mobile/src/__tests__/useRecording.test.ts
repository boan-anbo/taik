/**
 * Tests for useRecording hook
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useRecording } from '../hooks/useRecording';
import {
  __getLatestSession,
  __reset as resetSpeechEngine,
  MockSonioxSession,
} from '../../__mocks__/@taik/speech-engine';

// Reset mocks before each test
beforeEach(() => {
  resetSpeechEngine();
  vi.clearAllMocks();
});

describe('useRecording', () => {
  const defaultOptions = {
    apiKey: 'test-api-key',
    languageHints: ['en'],
    enableSpeakerDiarization: false,
  };

  describe('initial state', () => {
    it('should start in idle state', () => {
      const { result } = renderHook(() => useRecording(defaultOptions));

      expect(result.current.state).toBe('idle');
      expect(result.current.partialText).toBe('');
      expect(result.current.finalText).toBe('');
      expect(result.current.error).toBeNull();
    });
  });

  describe('API key validation', () => {
    it('should error when API key is empty', async () => {
      const onError = vi.fn();
      const { result } = renderHook(() =>
        useRecording({ ...defaultOptions, apiKey: '', onError })
      );

      await act(async () => {
        await result.current.startRecording();
      });

      expect(result.current.state).toBe('error');
      expect(result.current.error).toBe('Soniox API key is not configured');
      expect(onError).toHaveBeenCalled();
    });

    it('should error when API key is whitespace only', async () => {
      const { result } = renderHook(() =>
        useRecording({ ...defaultOptions, apiKey: '   ' })
      );

      await act(async () => {
        await result.current.startRecording();
      });

      expect(result.current.state).toBe('error');
      expect(result.current.error).toBe('Soniox API key is not configured');
    });
  });

  describe('startRecording', () => {
    it('should transition to starting then recording state', async () => {
      const onStart = vi.fn();
      const { result } = renderHook(() =>
        useRecording({ ...defaultOptions, onStart })
      );

      await act(async () => {
        await result.current.startRecording();
      });

      expect(result.current.state).toBe('recording');
      expect(onStart).toHaveBeenCalled();
    });

    it('should create a SonioxSession with correct options', async () => {
      const { result } = renderHook(() =>
        useRecording({
          apiKey: 'my-key',
          languageHints: ['en', 'es'],
          enableSpeakerDiarization: true,
          sampleRate: 48000,
        })
      );

      await act(async () => {
        await result.current.startRecording();
      });

      const session = __getLatestSession();
      expect(session).toBeDefined();
      expect(session?.options.apiKey).toBe('my-key');
      expect(session?.options.features.languageHints).toEqual(['en', 'es']);
      expect(session?.options.features.enableSpeakerDiarization).toBe(true);
      expect(session?.options.audio.sampleRate).toBe(48000);
    });

    it('should not start if already recording', async () => {
      const { result } = renderHook(() => useRecording(defaultOptions));

      await act(async () => {
        await result.current.startRecording();
      });

      const firstSession = __getLatestSession();

      await act(async () => {
        await result.current.startRecording();
      });

      // Should still be the same session
      expect(__getLatestSession()).toBe(firstSession);
    });
  });

  describe('transcript handling', () => {
    it('should update partialText for non-final transcripts', async () => {
      const { result } = renderHook(() => useRecording(defaultOptions));

      await act(async () => {
        await result.current.startRecording();
      });

      const session = __getLatestSession()!;

      await act(async () => {
        session.__emitTranscript('Hello', false);
      });

      expect(result.current.partialText).toBe('Hello');
      expect(result.current.finalText).toBe('');
    });

    it('should accumulate finalText for final transcripts', async () => {
      const { result } = renderHook(() => useRecording(defaultOptions));

      await act(async () => {
        await result.current.startRecording();
      });

      const session = __getLatestSession()!;

      await act(async () => {
        session.__emitTranscript('Hello ', true);
      });

      expect(result.current.finalText).toBe('Hello ');
      expect(result.current.partialText).toBe('');

      await act(async () => {
        session.__emitTranscript('world!', true);
      });

      expect(result.current.finalText).toBe('Hello world!');
    });

    it('should call onTranscript callback', async () => {
      const onTranscript = vi.fn();
      const { result } = renderHook(() =>
        useRecording({ ...defaultOptions, onTranscript })
      );

      await act(async () => {
        await result.current.startRecording();
      });

      const session = __getLatestSession()!;

      await act(async () => {
        session.__emitTranscript('test', true);
      });

      expect(onTranscript).toHaveBeenCalledWith(
        expect.objectContaining({ text: 'test', isFinal: true })
      );
    });
  });

  describe('error handling', () => {
    it('should handle non-recoverable errors', async () => {
      const onError = vi.fn();
      const { result } = renderHook(() =>
        useRecording({ ...defaultOptions, onError })
      );

      await act(async () => {
        await result.current.startRecording();
      });

      const session = __getLatestSession()!;

      await act(async () => {
        session.__emitError('Connection failed', false);
      });

      expect(result.current.state).toBe('error');
      expect(result.current.error).toBe('Connection failed');
      expect(onError).toHaveBeenCalled();
    });

    it('should handle recoverable errors without changing state', async () => {
      const onError = vi.fn();
      const { result } = renderHook(() =>
        useRecording({ ...defaultOptions, onError })
      );

      await act(async () => {
        await result.current.startRecording();
      });

      const session = __getLatestSession()!;

      await act(async () => {
        session.__emitError('Temporary network issue', true);
      });

      // State should still be recording
      expect(result.current.state).toBe('recording');
      expect(result.current.error).toBeNull();
      // But callback should still be called for logging
      expect(onError).toHaveBeenCalled();
    });
  });

  describe('stopRecording', () => {
    it('should transition to stopping then completed state', async () => {
      const onStop = vi.fn();
      const { result } = renderHook(() =>
        useRecording({ ...defaultOptions, onStop })
      );

      await act(async () => {
        await result.current.startRecording();
      });

      const session = __getLatestSession()!;

      await act(async () => {
        // Start stopping
        const stopPromise = result.current.stopRecording();

        // Simulate the completed event
        session.__emitCompleted('Final transcript');

        await stopPromise;
      });

      expect(result.current.state).toBe('completed');
      expect(result.current.finalText).toBe('Final transcript');
      expect(onStop).toHaveBeenCalled();
    });

    it('should not stop if not recording', async () => {
      const { result } = renderHook(() => useRecording(defaultOptions));

      await act(async () => {
        await result.current.stopRecording();
      });

      // Should still be idle
      expect(result.current.state).toBe('idle');
    });
  });

  describe('reset', () => {
    it('should reset all state to initial values', async () => {
      const { result } = renderHook(() => useRecording(defaultOptions));

      // Start recording and get some transcript
      await act(async () => {
        await result.current.startRecording();
      });

      const session = __getLatestSession()!;

      await act(async () => {
        session.__emitTranscript('Hello world', true);
      });

      expect(result.current.finalText).toBe('Hello world');

      // Reset
      act(() => {
        result.current.reset();
      });

      expect(result.current.state).toBe('idle');
      expect(result.current.partialText).toBe('');
      expect(result.current.finalText).toBe('');
      expect(result.current.error).toBeNull();
    });
  });

  describe('cleanup', () => {
    it('should dispose session on unmount', async () => {
      const { result, unmount } = renderHook(() => useRecording(defaultOptions));

      await act(async () => {
        await result.current.startRecording();
      });

      const session = __getLatestSession();
      expect(session).toBeDefined();

      unmount();

      // Session should be cleaned up
      expect(__getLatestSession()).toBeUndefined();
    });
  });
});
