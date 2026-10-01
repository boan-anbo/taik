/**
 * Recording Hook
 * Manages speech-to-text recording lifecycle with @taik/speech-engine
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  SonioxSession,
  type TranscriptResult,
  type TranscriptWord,
} from '@taik/speech-engine';
import type { TranscriptDisplayState } from '../types/transcript';
import { createTranscriptDisplayState } from '../types/transcript';

/**
 * Recording states
 */
export type RecordingState =
  | 'idle'
  | 'starting'
  | 'recording'
  | 'stopping'
  | 'completed'
  | 'error';

/**
 * Recording hook return type
 */
export interface UseRecordingReturn {
  /** Current recording state */
  state: RecordingState;
  /** Partial (interim) transcript text */
  partialText: string;
  /** Final transcript text */
  finalText: string;
  /** All final transcript results */
  results: TranscriptResult[];
  /** Current partial result (may have word-level data) */
  partialResult: TranscriptResult | null;
  /** Current words with timing info (from partial result) */
  words: TranscriptWord[];
  /** Display state for TranscriptDisplay component */
  displayState: TranscriptDisplayState;
  /** Error message if state is 'error' */
  error: string | null;
  /** Start recording */
  startRecording: () => Promise<void>;
  /** Stop recording */
  stopRecording: () => Promise<void>;
  /** Reset to idle state */
  reset: () => void;
}

/**
 * Recording hook options
 */
export interface UseRecordingOptions {
  /** Soniox API key */
  apiKey: string;
  /** Language hints */
  languageHints?: string[];
  /** Model override for realtime transcription */
  model?: string;
  /** Enable speaker diarization */
  enableSpeakerDiarization?: boolean;
  /** Realtime stop: max wait after finalize (ms). Undefined uses engine defaults. */
  finalizeTimeoutMs?: number;
  /** Realtime stop: min wait after finalize (ms). Undefined uses engine defaults. */
  finalizeMinWaitMs?: number;
  /** Sample rate (default: 16000) */
  sampleRate?: number;
  /**
   * External MediaStream to use for recording.
   * If provided, this stream will be used instead of creating a new one.
   * Useful for sharing a stream between visualization and transcription.
   */
  mediaStream?: MediaStream;
  /**
   * Lazily provide a MediaStream to use for recording.
   * Called right before starting audio capture.
   *
   * Prefer this over `mediaStream` when the stream must be created on-demand
   * (e.g. device selection + permission prompts).
   */
  getMediaStream?: () => Promise<MediaStream>;
  /**
   * Whether to stop the MediaStream tracks when recording stops.
   * Only applies when using an external mediaStream.
   * Default: false (caller manages the stream lifecycle)
   */
  stopStreamOnStop?: boolean;
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
    model,
    enableSpeakerDiarization = false,
    finalizeTimeoutMs,
    finalizeMinWaitMs,
    sampleRate = 16000,
    mediaStream,
    getMediaStream,
    stopStreamOnStop = false,
    onStart,
    onStop,
    onTranscript,
    onError,
  } = options;

  // Guard against extremely high stop/finalize settings that can make stop feel stalled.
  const effectiveFinalizeTimeoutMs = useMemo(() => {
    if (finalizeTimeoutMs == null) return undefined;
    return Math.min(Math.max(finalizeTimeoutMs, 0), 10000);
  }, [finalizeTimeoutMs]);

  const effectiveFinalizeMinWaitMs = useMemo(() => {
    if (finalizeMinWaitMs == null) return undefined;
    const minWait = Math.max(finalizeMinWaitMs, 0);
    if (effectiveFinalizeTimeoutMs == null) return minWait;
    return Math.min(minWait, effectiveFinalizeTimeoutMs);
  }, [finalizeMinWaitMs, effectiveFinalizeTimeoutMs]);

  // State
  const [state, setState] = useState<RecordingState>('idle');
  const [partialResult, setPartialResult] = useState<TranscriptResult | null>(null);
  const [results, setResults] = useState<TranscriptResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Preserve engine-emitted spacing across finalized segments.
  const finalText = useMemo(() => {
    return results.map((r) => r.text).join('').trim();
  }, [results]);

  const partialText = partialResult?.text ?? '';
  const words = partialResult?.words ?? [];

  // Create display state for TranscriptDisplay component
  const displayState = useMemo<TranscriptDisplayState>(() => {
    return createTranscriptDisplayState(results, partialResult);
  }, [results, partialResult]);

  // Session reference
  const sessionRef = useRef<SonioxSession | null>(null);

  // Track if component is mounted
  const isMountedRef = useRef(true);

  // Refs for callbacks to avoid stale closures
  const onTranscriptRef = useRef(onTranscript);
  const onErrorRef = useRef(onError);
  const onStartRef = useRef(onStart);
  const onStopRef = useRef(onStop);

  // Update callback refs
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
   * Cleanup a session
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
    setPartialResult(null);
    setResults([]);
    setError(null);
    setState('starting');

    try {
      // Create new session
      const session = new SonioxSession({
        apiKey,
        model,
        finalizeTimeoutMs: effectiveFinalizeTimeoutMs,
        finalizeMinWaitMs: effectiveFinalizeMinWaitMs,
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
          // Add to results array (finalText is computed from this)
          setResults((prev) => [...prev, result]);
          // Clear partial since it's now finalized
          setPartialResult(null);
        } else {
          // Store the full partial result (includes words for confidence display)
          setPartialResult(result);
        }

        onTranscriptRef.current?.(result);
      });

      // Handle errors
      session.on('error', ({ error: err, recoverable }) => {
        if (!isMountedRef.current) return;

        console.error('Soniox error:', err, recoverable ? '(recoverable)' : '(fatal)');
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

      // Handle completion
      session.on('completed', () => {
        if (!isMountedRef.current) return;

        // finalText is already computed from results array
        // No need to set it here - just update state
        setPartialResult(null);
        setState('completed');
        cleanupSession();
        onStopRef.current?.();
      });

      // Start audio capture - use external stream if provided
      const externalStream = mediaStream ?? (getMediaStream ? await getMediaStream() : undefined);

      if (externalStream) {
        await session.startMediaStream({
          stream: externalStream,
          sampleRate,
          stopTracksOnStop: stopStreamOnStop,
        });
      } else {
        await session.startMicrophone({
          sampleRate,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        });
      }

      if (isMountedRef.current) {
        setState('recording');
        onStartRef.current?.();
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to start recording';

      if (isMountedRef.current) {
        setError(message);
        setState('error');
        onErrorRef.current?.(err instanceof Error ? err : new Error(message));
      }

      cleanupSession();
    }
  }, [
    state,
    apiKey,
    languageHints,
    model,
    enableSpeakerDiarization,
    effectiveFinalizeTimeoutMs,
    effectiveFinalizeMinWaitMs,
    sampleRate,
    mediaStream,
    getMediaStream,
    stopStreamOnStop,
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
        await sessionRef.current.stop();
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to stop recording';

      if (isMountedRef.current) {
        setError(message);
        setState('error');
      }

      cleanupSession();
    }
  }, [state, cleanupSession]);

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

  return {
    state,
    partialText,
    finalText,
    results,
    partialResult,
    words,
    displayState,
    error,
    startRecording,
    stopRecording,
    reset,
  };
}
