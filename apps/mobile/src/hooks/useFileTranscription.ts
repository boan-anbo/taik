/**
 * File Transcription hook - manages async file transcription lifecycle
 * Integrates with @taik/speech-engine for file-based speech-to-text
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  AsyncFileSession,
  type AsyncTranscriptionResult,
  type AsyncTranscriptionProgress,
  type AsyncTranscriptToken,
  type CreateTranscriptionOptions,
} from '@taik/speech-engine';

/** File transcription states */
export type FileTranscriptionState =
  | 'idle'
  | 'uploading'
  | 'processing'
  | 'completed'
  | 'error';

/** File transcription hook return type */
export interface UseFileTranscriptionReturn {
  /** Current transcription state */
  state: FileTranscriptionState;

  /** Progress percentage (0-100) */
  progress: number;

  /** Final transcript text */
  text: string;

  /** Transcript tokens with timing info */
  tokens: AsyncTranscriptToken[];

  /** Audio duration in milliseconds */
  audioDurationMs: number;

  /** Error message if state is 'error' */
  error: string | null;

  /** Transcription ID (set after job is created) */
  transcriptionId: string | null;

  /** Transcribe a file from URL */
  transcribeUrl: (audioUrl: string) => Promise<void>;

  /** Transcribe a file from data */
  transcribeFile: (fileData: ArrayBuffer | Blob, fileName: string) => Promise<void>;

  /** Cancel current transcription */
  cancel: () => void;

  /** Reset to idle state */
  reset: () => void;
}

/** File transcription hook options */
export interface UseFileTranscriptionOptions {
  /** Soniox API key */
  apiKey: string;

  /** Language hints */
  languageHints?: string[];

  /** Enable speaker diarization */
  enableSpeakerDiarization?: boolean;

  /** Enable language identification */
  enableLanguageIdentification?: boolean;

  /** Additional context for transcription accuracy */
  context?: string;

  /** Callback when transcription starts */
  onStart?: () => void;

  /** Callback when transcription completes */
  onComplete?: (result: AsyncTranscriptionResult) => void;

  /** Callback on progress update */
  onProgress?: (progress: AsyncTranscriptionProgress) => void;

  /** Callback on error */
  onError?: (error: Error) => void;
}

/**
 * Hook for managing async file transcription with Soniox
 *
 * @example
 * ```tsx
 * const {
 *   state,
 *   progress,
 *   text,
 *   error,
 *   transcribeUrl,
 *   transcribeFile,
 *   reset,
 * } = useFileTranscription({ apiKey: 'your-key' });
 *
 * // Transcribe from URL
 * await transcribeUrl('https://example.com/audio.mp3');
 *
 * // Or from file picker
 * await transcribeFile(fileData, 'recording.mp3');
 * ```
 */
export function useFileTranscription(
  options: UseFileTranscriptionOptions
): UseFileTranscriptionReturn {
  const {
    apiKey,
    languageHints,
    enableSpeakerDiarization,
    enableLanguageIdentification,
    context,
    onStart,
    onComplete,
    onProgress,
    onError,
  } = options;

  // State
  const [state, setState] = useState<FileTranscriptionState>('idle');
  const [progress, setProgress] = useState(0);
  const [text, setText] = useState('');
  const [tokens, setTokens] = useState<AsyncTranscriptToken[]>([]);
  const [audioDurationMs, setAudioDurationMs] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [transcriptionId, setTranscriptionId] = useState<string | null>(null);

  // Session reference
  const sessionRef = useRef<AsyncFileSession | null>(null);

  // Track if component is mounted
  const isMountedRef = useRef(true);

  // Refs for callbacks to avoid stale closures
  const onStartRef = useRef(onStart);
  const onCompleteRef = useRef(onComplete);
  const onProgressRef = useRef(onProgress);
  const onErrorRef = useRef(onError);

  // Update callback refs
  useEffect(() => {
    onStartRef.current = onStart;
    onCompleteRef.current = onComplete;
    onProgressRef.current = onProgress;
    onErrorRef.current = onError;
  }, [onStart, onComplete, onProgress, onError]);

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
   * Create transcription options from hook options
   */
  const getTranscriptionOptions = useCallback(
    (): Omit<CreateTranscriptionOptions, 'audioUrl' | 'fileId'> => ({
      languageHints,
      enableSpeakerDiarization,
      enableLanguageIdentification,
      context,
    }),
    [languageHints, enableSpeakerDiarization, enableLanguageIdentification, context]
  );

  /**
   * Create and configure a new session
   */
  const createSession = useCallback(() => {
    // Validate API key
    if (!apiKey || apiKey.trim() === '') {
      throw new Error('Soniox API key is not configured');
    }

    const session = new AsyncFileSession({ apiKey });

    // Handle upload start
    session.on('upload-start', () => {
      if (!isMountedRef.current) return;
      setState('uploading');
      setProgress(0);
    });

    // Handle upload complete
    session.on('upload-complete', () => {
      if (!isMountedRef.current) return;
      setProgress(10);
    });

    // Handle job created
    session.on('job-created', ({ transcriptionId: id }) => {
      if (!isMountedRef.current) return;
      setTranscriptionId(id);
      setState('processing');
    });

    // Handle progress
    session.on('progress', (p) => {
      if (!isMountedRef.current) return;
      setProgress(p.progress);
      onProgressRef.current?.(p);
    });

    // Handle completion
    session.on('complete', (result) => {
      if (!isMountedRef.current) return;
      setText(result.text);
      setTokens(result.tokens);
      setAudioDurationMs(result.audioDurationMs);
      setProgress(100);
      setState('completed');
      cleanupSession();
      onCompleteRef.current?.(result);
    });

    // Handle error
    session.on('error', ({ error: err }) => {
      if (!isMountedRef.current) return;
      const message = err instanceof Error ? err.message : 'Transcription failed';
      setError(message);
      setState('error');
      cleanupSession();
      onErrorRef.current?.(err instanceof Error ? err : new Error(message));
    });

    return session;
  }, [apiKey, cleanupSession]);

  /**
   * Transcribe a file from URL
   */
  const transcribeUrl = useCallback(
    async (audioUrl: string) => {
      if (state !== 'idle' && state !== 'completed' && state !== 'error') {
        return;
      }

      // Reset state
      setText('');
      setTokens([]);
      setAudioDurationMs(0);
      setError(null);
      setTranscriptionId(null);
      setProgress(0);
      setState('processing');

      try {
        const session = createSession();
        sessionRef.current = session;

        onStartRef.current?.();

        await session.transcribeUrl(audioUrl, getTranscriptionOptions());
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to transcribe URL';

        if (isMountedRef.current) {
          setError(message);
          setState('error');
          onErrorRef.current?.(err instanceof Error ? err : new Error(message));
        }

        cleanupSession();
      }
    },
    [state, createSession, getTranscriptionOptions, cleanupSession]
  );

  /**
   * Transcribe a file from data
   */
  const transcribeFile = useCallback(
    async (fileData: ArrayBuffer | Blob, fileName: string) => {
      if (state !== 'idle' && state !== 'completed' && state !== 'error') {
        return;
      }

      // Reset state
      setText('');
      setTokens([]);
      setAudioDurationMs(0);
      setError(null);
      setTranscriptionId(null);
      setProgress(0);
      setState('uploading');

      try {
        const session = createSession();
        sessionRef.current = session;

        onStartRef.current?.();

        await session.transcribeFile(fileData, fileName, getTranscriptionOptions());
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to transcribe file';

        if (isMountedRef.current) {
          setError(message);
          setState('error');
          onErrorRef.current?.(err instanceof Error ? err : new Error(message));
        }

        cleanupSession();
      }
    },
    [state, createSession, getTranscriptionOptions, cleanupSession]
  );

  /**
   * Cancel current transcription
   */
  const cancel = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current.abort();
      cleanupSession();
    }

    if (isMountedRef.current) {
      setState('idle');
      setProgress(0);
    }
  }, [cleanupSession]);

  /**
   * Reset to idle state
   */
  const reset = useCallback(() => {
    cleanupSession();

    setText('');
    setTokens([]);
    setAudioDurationMs(0);
    setError(null);
    setTranscriptionId(null);
    setProgress(0);
    setState('idle');
  }, [cleanupSession]);

  return {
    state,
    progress,
    text,
    tokens,
    audioDurationMs,
    error,
    transcriptionId,
    transcribeUrl,
    transcribeFile,
    cancel,
    reset,
  };
}
