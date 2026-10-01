/**
 * Recording hook - manages transcription lifecycle
 * Integrates with @taik/speech-engine for real-time speech-to-text
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  SonioxSession,
  type TranscriptResult,
  type TranscriptWord,
} from '@taik/speech-engine';

/** Recording states */
export type RecordingState =
  | 'idle'
  | 'starting'
  | 'recording'
  | 'stopping'
  | 'completed'
  | 'error';

/** Recording hook return type */
export interface UseRecordingReturn {
  /** Current recording state */
  state: RecordingState;

  /** Partial (interim) transcript text */
  partialText: string;

  /** Final transcript text */
  finalText: string;

  /** All final transcript results */
  results: TranscriptResult[];

  /** Current words with timing info */
  words: TranscriptWord[];

  /** Error message if state is 'error' */
  error: string | null;

  /** Start recording */
  startRecording: () => Promise<void>;

  /** Stop recording */
  stopRecording: () => Promise<void>;

  /** Reset to idle state */
  reset: () => void;
}

/** Recording hook options */
export interface UseRecordingOptions {
  /** Soniox API key */
  apiKey: string;

  /** Language hints */
  languageHints?: string[];

  /** Enable speaker diarization */
  enableSpeakerDiarization?: boolean;

  /** Sample rate (default: 16000) */
  sampleRate?: number;

  /** Callback when recording starts */
  onStart?: () => void;

  /** Callback when recording stops */
  onStop?: () => void;

  /** Callback for each transcript result */
  onTranscript?: (result: TranscriptResult) => void;

  /** Callback on error */
  onError?: (error: Error) => void;
}

/**
 * Hook for managing speech-to-text recording with Soniox
 */
export function useRecording(options: UseRecordingOptions): UseRecordingReturn {
  const {
    apiKey,
    languageHints = ['en'],
    enableSpeakerDiarization = false,
    sampleRate = 16000,
    onStart,
    onStop,
    onTranscript,
    onError,
  } = options;

  // State
  const [state, setState] = useState<RecordingState>('idle');
  const [partialText, setPartialText] = useState('');
  const [finalText, setFinalText] = useState('');
  const [results, setResults] = useState<TranscriptResult[]>([]);
  const [words, setWords] = useState<TranscriptWord[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Session reference
  const sessionRef = useRef<SonioxSession | null>(null);

  // Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);

  // Refs for callbacks to avoid stale closures in event handlers
  const onTranscriptRef = useRef(onTranscript);
  const onErrorRef = useRef(onError);
  const onStartRef = useRef(onStart);
  const onStopRef = useRef(onStop);

  // Update callback refs when callbacks change
  useEffect(() => {
    onTranscriptRef.current = onTranscript;
    onErrorRef.current = onError;
    onStartRef.current = onStart;
    onStopRef.current = onStop;
  }, [onTranscript, onError, onStart, onStop]);

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
   * Safely cleanup a session
   */
  const cleanupSession = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current.dispose();
      sessionRef.current = null;
    }
  }, []);

  /**
   * Start recording
   */
  const startRecording = useCallback(async () => {
    if (state !== 'idle' && state !== 'completed' && state !== 'error') {
      return;
    }

    // Validate API key
    if (!apiKey || apiKey.trim() === '') {
      setError('Soniox API key is not configured');
      setState('error');
      onErrorRef.current?.(new Error('Soniox API key is not configured'));
      return;
    }

    // Reset state
    setPartialText('');
    setFinalText('');
    setResults([]);
    setWords([]);
    setError(null);
    setState('starting');

    try {
      // Create new session
      const session = new SonioxSession({
        apiKey,
        features: {
          languageHints,
          enableSpeakerDiarization,
        },
        audio: {
          format: 'pcm_s16le',
          sampleRate,
          channels: 1,
        },
      });

      sessionRef.current = session;

      // Handle transcript events
      session.on('transcript', (result: TranscriptResult) => {
        if (!isMountedRef.current) return;

        if (result.isFinal) {
          setFinalText((prev) => prev + result.text);
          setResults((prev) => [...prev, result]);
          setPartialText('');
        } else {
          setPartialText(result.text);
        }

        // Update words from latest result
        if (result.words) {
          setWords(result.words);
        }

        onTranscriptRef.current?.(result);
      });

      // Handle errors
      session.on('error', ({ error: err, recoverable }) => {
        if (!isMountedRef.current) return;

        console.error('Soniox error:', err, recoverable ? '(recoverable)' : '(fatal)');

        // Always notify via callback (for logging/debugging)
        onErrorRef.current?.(err);

        if (!recoverable) {
          setError(err.message);
          setState('error');
          cleanupSession();
        }
      });

      // Handle connection
      session.on('connected', () => {
        console.log('Connected to Soniox');
      });

      // Handle completion - session manages its own cleanup after this
      session.on('completed', ({ fullText }) => {
        if (!isMountedRef.current) return;

        setFinalText(fullText);
        setState('completed');
        cleanupSession();
        onStopRef.current?.();
      });

      // Start microphone capture
      await session.startMicrophone({
        sampleRate,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      });

      if (isMountedRef.current) {
        setState('recording');
        onStartRef.current?.();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start recording';

      if (isMountedRef.current) {
        setError(message);
        setState('error');
        onErrorRef.current?.(err instanceof Error ? err : new Error(message));
      }

      // Cleanup session on error
      cleanupSession();
    }
  }, [
    state,
    apiKey,
    languageHints,
    enableSpeakerDiarization,
    sampleRate,
    cleanupSession,
  ]);

  /**
   * Stop recording
   */
  const stopRecording = useCallback(async () => {
    if (state !== 'recording') {
      return;
    }

    setState('stopping');

    try {
      if (sessionRef.current) {
        // stop() triggers the 'completed' event which handles cleanup and state change
        await sessionRef.current.stop();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to stop recording';

      if (isMountedRef.current) {
        setError(message);
        setState('error');
      }

      // Cleanup on error
      cleanupSession();
    }
  }, [state, cleanupSession]);

  /**
   * Reset to idle state
   */
  const reset = useCallback(() => {
    cleanupSession();

    setPartialText('');
    setFinalText('');
    setResults([]);
    setWords([]);
    setError(null);
    setState('idle');
  }, [cleanupSession]);

  return {
    state,
    partialText,
    finalText,
    results,
    words,
    error,
    startRecording,
    stopRecording,
    reset,
  };
}
