/**
 * Real-time Transcription Hook
 * Streams audio buffer through Soniox WebSocket for real-time transcription
 * Shows partial results as they arrive
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  SonioxSession,
  type TranscriptResult,
  type BufferSourceOptions,
} from '@taik/speech-engine';
import { createTranscriptDisplayState, type TranscriptDisplayState } from '../types/transcript';

/**
 * Transcription states
 */
export type RealtimeTranscriptionState =
  | 'idle'
  | 'transcribing'
  | 'completed'
  | 'error';

/**
 * Hook options
 */
export interface UseRealtimeTranscriptionOptions {
  /** Soniox API key */
  apiKey: string;
  /** Language hints for recognition */
  languageHints?: string[];
}

/**
 * Hook return type
 */
export interface UseRealtimeTranscriptionReturn {
  /** Current state */
  state: RealtimeTranscriptionState;
  /** Partial (interim) transcript text */
  partialText: string;
  /** Final transcript text */
  finalText: string;
  /** Display state for TranscriptDisplay component */
  displayState: TranscriptDisplayState;
  /** Error message if state is 'error' */
  error: string | null;
  /** Start transcription with audio buffer */
  transcribe: (audioData: ArrayBuffer, format?: BufferSourceOptions['format']) => Promise<void>;
  /** Reset to idle state */
  reset: () => void;
}

/**
 * Hook for real-time transcription of audio buffer via WebSocket
 * Shows partial results as they stream in
 */
export function useRealtimeTranscription(
  options: UseRealtimeTranscriptionOptions
): UseRealtimeTranscriptionReturn {
  const { apiKey, languageHints = ['en'] } = options;

  // State
  const [state, setState] = useState<RealtimeTranscriptionState>('idle');
  const [partialResult, setPartialResult] = useState<TranscriptResult | null>(null);
  const [results, setResults] = useState<TranscriptResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Session reference
  const sessionRef = useRef<SonioxSession | null>(null);
  const isMountedRef = useRef(true);

  // Track mounted state
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sessionRef.current) {
        sessionRef.current.dispose();
        sessionRef.current = null;
      }
    };
  }, []);

  // Derived state
  const finalText = results.map((r) => r.text).join('').trim();

  const partialText = partialResult?.text ?? '';

  const displayState = createTranscriptDisplayState(results, partialResult);

  /**
   * Cleanup session
   */
  const cleanupSession = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current.dispose();
      sessionRef.current = null;
    }
  }, []);

  /**
   * Reset to idle state
   */
  const reset = useCallback(() => {
    cleanupSession();
    setPartialResult(null);
    setResults([]);
    setError(null);
    setState('idle');
  }, [cleanupSession]);

  /**
   * Start transcription with audio buffer
   */
  const transcribe = useCallback(
    async (audioData: ArrayBuffer, format: BufferSourceOptions['format'] = 'auto') => {
      if (state === 'transcribing') {
        return;
      }

      // Validate API key
      if (!apiKey || apiKey.trim() === '') {
        setError('API key is not configured');
        setState('error');
        return;
      }

      // Reset state
      setPartialResult(null);
      setResults([]);
      setError(null);
      setState('transcribing');

      try {
        // Create session
        const session = new SonioxSession({
          apiKey,
          features: {
            languageHints,
          },
          audio: {
            format,
            sampleRate: 16000,
            channels: 1,
          },
        });

        sessionRef.current = session;

        // Handle transcript events
        session.on('transcript', (result: TranscriptResult) => {
          if (!isMountedRef.current) return;

          if (result.isFinal) {
            setResults((prev) => [...prev, result]);
            setPartialResult(null);
          } else {
            setPartialResult(result);
          }
        });

        // Handle errors
        session.on('error', ({ error: err, recoverable }) => {
          if (!isMountedRef.current) return;

          console.error('Soniox real-time error:', err, recoverable ? '(recoverable)' : '(fatal)');

          if (!recoverable) {
            setError(err.message);
            setState('error');
            cleanupSession();
          }
        });

        // Handle completion
        session.on('completed', () => {
          if (!isMountedRef.current) return;

          setPartialResult(null);
          setState('completed');
          cleanupSession();
        });

        // Start buffer streaming
        await session.startBuffer({
          buffer: audioData,
          format,
          sampleRate: 16000,
          channels: 1,
          simulateRealtime: true, // Stream at real-time pace for better UX
          chunkDurationMs: 100,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to start transcription';

        if (isMountedRef.current) {
          setError(message);
          setState('error');
        }

        cleanupSession();
      }
    },
    [state, apiKey, languageHints, cleanupSession]
  );

  return {
    state,
    partialText,
    finalText,
    displayState,
    error,
    transcribe,
    reset,
  };
}
