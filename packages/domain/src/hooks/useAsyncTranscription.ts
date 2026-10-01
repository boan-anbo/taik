/**
 * Async Transcription Hook
 * Uploads audio file to Soniox REST API for batch transcription
 * Shows progress during processing, final result when complete
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  AsyncFileSession,
  type AsyncTranscriptionProgress,
  type AsyncTranscriptionResult,
} from '@taik/speech-engine';

/**
 * Transcription states
 */
export type AsyncTranscriptionState =
  | 'idle'
  | 'uploading'
  | 'processing'
  | 'completed'
  | 'error';

/**
 * Hook options
 */
export interface UseAsyncTranscriptionOptions {
  /** Soniox API key */
  apiKey: string;
  /** Language hints for recognition */
  languageHints?: string[];
  /** Soniox model override (async) */
  model?: string;
}

/**
 * Hook return type
 */
export interface UseAsyncTranscriptionReturn {
  /** Current state */
  state: AsyncTranscriptionState;
  /** Progress percentage (0-100) */
  progress: number;
  /** Final transcript text */
  finalText: string;
  /** Full result with tokens */
  result: AsyncTranscriptionResult | null;
  /** Error message if state is 'error' */
  error: string | null;
  /** Start transcription with audio buffer */
  transcribe: (audioData: ArrayBuffer, fileName: string) => Promise<void>;
  /** Reset to idle state */
  reset: () => void;
  /** Abort current transcription */
  abort: () => void;
}

/**
 * Map progress status to state
 */
function progressStatusToState(status: AsyncTranscriptionProgress['status']): AsyncTranscriptionState {
  switch (status) {
    case 'queued':
      return 'uploading';
    case 'processing':
      return 'processing';
    case 'completed':
      return 'completed';
    case 'error':
      return 'error';
    default:
      return 'processing';
  }
}

/**
 * Hook for async transcription of audio file via REST API
 * Shows progress, only displays final result when complete
 */
export function useAsyncTranscription(
  options: UseAsyncTranscriptionOptions
): UseAsyncTranscriptionReturn {
  const { apiKey, languageHints = ['en'], model } = options;

  // State
  const [state, setState] = useState<AsyncTranscriptionState>('idle');
  const [progress, setProgress] = useState(0);
  const [finalText, setFinalText] = useState('');
  const [result, setResult] = useState<AsyncTranscriptionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Session reference
  const sessionRef = useRef<AsyncFileSession | null>(null);
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
    setProgress(0);
    setFinalText('');
    setResult(null);
    setError(null);
    setState('idle');
  }, [cleanupSession]);

  /**
   * Abort current transcription
   */
  const abort = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current.abort();
    }
    cleanupSession();
    setProgress(0);
    setFinalText('');
    setResult(null);
    setError(null);
    setState('idle');
  }, [cleanupSession]);

  /**
   * Start transcription with audio buffer
   */
  const transcribe = useCallback(
    async (audioData: ArrayBuffer, fileName: string) => {
      if (state === 'uploading' || state === 'processing') {
        return;
      }

      // Validate API key
      if (!apiKey || apiKey.trim() === '') {
        setError('API key is not configured');
        setState('error');
        return;
      }

      // Reset state
      setProgress(0);
      setFinalText('');
      setResult(null);
      setError(null);
      setState('uploading');

      try {
        // Create session
        const session = new AsyncFileSession({
          apiKey,
        });

        sessionRef.current = session;

        // Handle progress updates
        session.on('progress', (p: AsyncTranscriptionProgress) => {
          if (!isMountedRef.current) return;

          setProgress(p.progress);
          setState(progressStatusToState(p.status));
        });

        // Handle completion
        session.on('complete', (r: AsyncTranscriptionResult) => {
          if (!isMountedRef.current) return;

          setFinalText(r.text);
          setResult(r);
          setProgress(100);
          setState('completed');
          cleanupSession();
        });

        // Handle errors
        session.on('error', ({ error: err }) => {
          if (!isMountedRef.current) return;

          console.error('Soniox async error:', err);
          setError(err.message);
          setState('error');
          cleanupSession();
        });

        // Start transcription
        await session.transcribeFile(audioData, fileName, {
          languageHints,
          model,
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
    [state, apiKey, languageHints, model, cleanupSession]
  );

  return {
    state,
    progress,
    finalText,
    result,
    error,
    transcribe,
    reset,
    abort,
  };
}
