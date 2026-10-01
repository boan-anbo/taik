/**
 * Recording Session Hook
 * Orchestrates recording with mode selection (realtime vs async)
 * Provides unified interface for both modes with waveform visualization
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useRecording, type RecordingState } from './useRecording';
import { useAsyncTranscription, type AsyncTranscriptionState } from './useAsyncTranscription';
import { useAudioVisualization, type AudioVisualizationData } from './useAudioVisualization';
import { useAudioStreamManager, type StreamState } from './useAudioStreamManager';
import { useVoiceStore } from '../stores/voiceStore';
import { useTranscriptStore } from '../stores/transcriptStore';
import type { TranscriptDisplayState } from '../types/transcript';
import { createTranscriptDisplayState } from '../types/transcript';
import type { RecordingMode, VoiceRecordingResult, VoiceOutputDestination } from '../types/voice';
import type { IAudioAdapter } from '@taik/capabilities';
import type { IMediaDeviceAdapter, AudioInputDevice, MediaStreamOptions } from '@taik/capabilities';

// Re-export adapter interfaces from useVoiceRecording to avoid duplication
export type {
  IVoiceTextInputAdapter as ITextInputAdapter,
  IVoiceSystemAdapter as ISystemAdapter,
} from './useVoiceRecording';

// Import for internal use
import type { IVoiceTextInputAdapter, IVoiceSystemAdapter } from './useVoiceRecording';

/**
 * Unified session states
 */
export type SessionState =
  | 'idle'
  | 'starting'
  | 'recording'
  | 'stopping'
  | 'processing' // async mode: uploading/transcribing
  | 'completed'
  | 'error';

/**
 * Hook options
 */
export interface UseRecordingSessionOptions {
  /** Soniox API key */
  apiKey: string;
  /** Language hints for transcription */
  languageHints?: string[];
  /** Realtime stop: max wait after finalize (ms). */
  finalizeTimeoutMs?: number;
  /** Realtime stop: min wait after finalize (ms). */
  finalizeMinWaitMs?: number;
  /** Media device adapter for audio input selection + shared streams */
  deviceAdapter?: IMediaDeviceAdapter;
  /** Stream options applied when creating a MediaStream via deviceAdapter */
  streamOptions?: Omit<MediaStreamOptions, 'deviceId'>;
  /** Audio adapter for file operations (required if saveAudioFiles setting is enabled) */
  audioAdapter?: IAudioAdapter;
  /** Speech engine identifier for history metadata (default: soniox) */
  engineId?: string;
  /** Model name used for transcription (for history metadata) */
  transcriptionModel?: string;
  /** Text input adapter (for auto-insert) */
  textInputAdapter?: IVoiceTextInputAdapter;
  /** System adapter (for clipboard, window) */
  systemAdapter?: IVoiceSystemAdapter;
  /** Disable waveform visualization and monitoring helpers */
  enableVisualization?: boolean;
  /** Callback when recording completes with result */
  onCompleted?: (result: VoiceRecordingResult) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
}

/**
 * Hook return type
 */
export interface UseRecordingSessionReturn {
  /** Current session state */
  state: SessionState;
  /** Current recording mode being used */
  mode: RecordingMode;
  /** Whether actively recording audio */
  isRecording: boolean;
  /** Whether processing (async mode only) */
  isProcessing: boolean;
  /** Progress percentage for async mode (0-100) */
  progress: number;
  /** Recording duration in seconds */
  duration: number;
  /** Final transcript text */
  finalText: string;
  /** Partial transcript text (realtime mode only) */
  partialText: string;
  /** Display state for TranscriptDisplay component */
  displayState: TranscriptDisplayState;
  /** Audio visualization data */
  visualization: AudioVisualizationData;
  /** Error message if state is 'error' */
  error: string | null;
  /** Available audio input devices (empty if deviceAdapter not provided) */
  audioDevices: AudioInputDevice[];
  /** Selected audio input device ID (undefined = system default) */
  selectedAudioDeviceId: string | undefined;
  /** Whether microphone permission is granted */
  hasAudioPermission: boolean;
  /** Current stream state */
  audioStreamState: StreamState;
  /** Request microphone permission */
  requestAudioPermission: () => Promise<boolean>;
  /** Select an audio input device */
  selectAudioDevice: (deviceId: string | undefined) => Promise<void>;
  /** Whether input monitoring is active (not recording) */
  isMonitoring: boolean;
  /** Start monitoring selected input (shows waveform/level) */
  startMonitoring: () => Promise<void>;
  /** Stop monitoring selected input */
  stopMonitoring: () => void;
  /** Whether input signal is detected (based on visualization volume) */
  hasAudioSignal: boolean;
  /** Whether audio capture is blocked until user interacts with the window (autoplay/user-gesture policy) */
  requiresUserActivation: boolean;
  /** Clear the activation-required flag (typically after the user clicks) */
  clearUserActivationRequirement: () => void;
  /** Start recording */
  startRecording: () => Promise<void>;
  /** Stop recording (triggers transcription in async mode) */
  stopRecording: () => Promise<void>;
  /** Cancel recording (discard audio) */
  cancelRecording: () => void;
  /** Reset to idle state */
  reset: () => void;
  /** Manually insert current text */
  insertText: () => Promise<boolean>;
  /** Manually copy current text to clipboard */
  copyToClipboard: () => Promise<void>;
}

const NOOP_MEDIA_DEVICE_ADAPTER: IMediaDeviceAdapter = {
  isSupported: () => false,
  enumerateAudioInputs: async () => [],
  getUserMedia: async () => {
    throw new Error('Media devices adapter not configured');
  },
  onDeviceChange: () => () => {},
  requestPermission: async () => false,
  hasPermission: async () => false,
};

/**
 * Map recording state to session state
 */
function recordingStateToSession(state: RecordingState): SessionState {
  switch (state) {
    case 'idle':
      return 'idle';
    case 'starting':
      return 'starting';
    case 'recording':
      return 'recording';
    case 'stopping':
      return 'stopping';
    case 'completed':
      return 'completed';
    case 'error':
      return 'error';
    default:
      return 'idle';
  }
}

/**
 * Map async state to session state
 */
function asyncStateToSession(state: AsyncTranscriptionState): SessionState {
  switch (state) {
    case 'idle':
      return 'idle';
    case 'uploading':
    case 'processing':
      return 'processing';
    case 'completed':
      return 'completed';
    case 'error':
      return 'error';
    default:
      return 'idle';
  }
}

/**
 * Hook for unified recording session with mode selection
 */
export function useRecordingSession(
  options: UseRecordingSessionOptions
): UseRecordingSessionReturn {
  const {
    apiKey,
    languageHints = ['en'],
    finalizeTimeoutMs,
    finalizeMinWaitMs,
    deviceAdapter,
    streamOptions,
    audioAdapter,
    engineId = 'soniox',
    transcriptionModel,
    textInputAdapter,
    systemAdapter,
    enableVisualization = true,
    onCompleted,
    onError,
  } = options;

  const { settings } = useVoiceStore();
  const { addEntry } = useTranscriptStore();
  const mode = settings.recordingMode;
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

  // Local recording state (async mode)
  const [localState, setLocalState] = useState<'idle' | 'recording' | 'stopped'>('idle');
  const [duration, setDuration] = useState(0);
  const [asyncFinalText, setAsyncFinalText] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Refs for local recording
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioDataRef = useRef<ArrayBuffer | null>(null); // Cache audio data to avoid race condition
  const localAudioFormatRef = useRef<string | undefined>(undefined);
  const recordingStartRef = useRef<number | null>(null);
  const realtimeRecorderRef = useRef<MediaRecorder | null>(null);
  const realtimeChunksRef = useRef<Blob[]>([]);
  const realtimeAudioDataRef = useRef<ArrayBuffer | null>(null);
  const realtimeStopPromiseRef = useRef<Promise<ArrayBuffer | null> | null>(null);
  const realtimeAudioFormatRef = useRef<string | undefined>(undefined);
  const durationIntervalRef = useRef<number | null>(null);
  const targetAppNameRef = useRef<string | null>(null);
  const isMountedRef = useRef(true);
  const realtimeCompletedRef = useRef(false); // Track if realtime completion was processed
  const [isMonitoring, setIsMonitoring] = useState(false);
  const isMonitoringRef = useRef(false);
  const [requiresUserActivation, setRequiresUserActivation] = useState(false);

  useEffect(() => {
    isMonitoringRef.current = isMonitoring;
  }, [isMonitoring]);

  const effectiveDeviceAdapter = deviceAdapter ?? NOOP_MEDIA_DEVICE_ADAPTER;
  const audioStreamManager = useAudioStreamManager({
    deviceAdapter: effectiveDeviceAdapter,
    autoRequestPermission: false,
    streamOptions,
  });
  const {
    state: audioStreamState,
    devices: audioDevices,
    selectedDeviceId: selectedAudioDeviceId,
    stream: audioStream,
    hasPermission: hasAudioPermission,
    startStream: startAudioStream,
    stopStream: stopAudioStream,
    selectDevice: selectAudioDevice,
    requestPermission: requestAudioPermission,
  } = audioStreamManager;

  const isDeviceAdapterEnabled = useMemo(() => {
    try {
      return deviceAdapter?.isSupported() ?? false;
    } catch {
      return false;
    }
  }, [deviceAdapter]);

  const ensureStream = useCallback(async (): Promise<MediaStream> => {
    if (!isDeviceAdapterEnabled) {
      throw new Error('Media devices adapter not supported or not configured');
    }

    if (audioStream) {
      return audioStream;
    }

    return await startAudioStream();
  }, [audioStream, isDeviceAdapterEnabled, startAudioStream]);

  const maybeMarkUserActivationRequired = useCallback((message: string) => {
    const msg = message.toLowerCase();
    const looksLikeUserGestureBlock =
      message.includes('USER_GESTURE_REQUIRED') ||
      msg.includes('audiocontext was not allowed to start') ||
      msg.includes('not allowed to start') ||
      msg.includes('user gesture') ||
      msg.includes('must be resumed') ||
      msg.includes('suspended');

    if (looksLikeUserGestureBlock) {
      setRequiresUserActivation(true);
    }
  }, []);

  // Callback refs to avoid stale closures
  const onCompletedRef = useRef(onCompleted);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onCompletedRef.current = onCompleted;
    onErrorRef.current = onError;
  }, [onCompleted, onError]);

  // Track mounted state
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Validate audioAdapter when saveAudioFiles is enabled (Fix #10)
  useEffect(() => {
    if (settings.saveAudioFiles && !audioAdapter) {
      console.warn(
        '[useRecordingSession] saveAudioFiles is enabled but no audioAdapter provided. ' +
        'Audio files will not be saved. Provide an audioAdapter or disable saveAudioFiles in settings.'
      );
    }
  }, [settings.saveAudioFiles, audioAdapter]);

  // Realtime mode hooks
  const realtime = useRecording({
    apiKey,
    languageHints,
    model: transcriptionModel,
    finalizeTimeoutMs: effectiveFinalizeTimeoutMs,
    finalizeMinWaitMs: effectiveFinalizeMinWaitMs,
    getMediaStream: isDeviceAdapterEnabled ? ensureStream : undefined,
    stopStreamOnStop: false,
    onStart: async () => {
      recordingStartRef.current = Date.now();
      if (textInputAdapter?.getFocusedAppName) {
        try {
          targetAppNameRef.current = await textInputAdapter.getFocusedAppName();
        } catch {
          targetAppNameRef.current = null;
        }
      }
    },
    onError: (err) => {
      onErrorRef.current?.(err);
    },
  });

  // Async mode hooks
  const async_ = useAsyncTranscription({
    apiKey,
    languageHints,
    model: transcriptionModel,
  });

  // Audio visualization
  const visualization = useAudioVisualization({
    barCount: 32,
    updateInterval: 50,
  });
  const {
    data: visualizationData,
    isActive: isVisualizationActive,
    needsUserActivation: visualizationNeedsActivation,
    resume: resumeVisualization,
    connect: connectVisualization,
    disconnect: disconnectVisualization,
  } = visualization;

  const emptyVisualization: AudioVisualizationData = {
    waveform: [],
    volume: 0,
    peak: 0,
  };
  const effectiveVisualization = enableVisualization ? visualizationData : emptyVisualization;
  const effectiveVisualizationActive = enableVisualization ? isVisualizationActive : false;
  const effectiveVisualizationNeedsActivation = enableVisualization ? visualizationNeedsActivation : false;

  const connectVisualizationSafe = useCallback(
    (stream: MediaStream) => {
      if (!enableVisualization) return;
      connectVisualization(stream);
    },
    [connectVisualization, enableVisualization]
  );

  const disconnectVisualizationSafe = useCallback(() => {
    if (!enableVisualization) return;
    disconnectVisualization();
  }, [disconnectVisualization, enableVisualization]);

  const resumeVisualizationSafe = useCallback(async () => {
    if (!enableVisualization) return;
    await resumeVisualization();
  }, [enableVisualization, resumeVisualization]);

  useEffect(() => {
    if (effectiveVisualizationNeedsActivation) {
      setRequiresUserActivation(true);
    }
  }, [effectiveVisualizationNeedsActivation]);

  const clearUserActivationRequirement = useCallback(() => {
    setRequiresUserActivation(false);
    void resumeVisualizationSafe();
  }, [resumeVisualizationSafe]);

  const ensureStreamWithVisualization = useCallback(async (): Promise<MediaStream> => {
    const stream = await ensureStream();
    if (!effectiveVisualizationActive) {
      connectVisualizationSafe(stream);
    }
    if (effectiveVisualizationNeedsActivation) {
      setRequiresUserActivation(true);
    }
    return stream;
  }, [
    connectVisualizationSafe,
    effectiveVisualizationActive,
    effectiveVisualizationNeedsActivation,
    ensureStream,
  ]);

  const startMonitoring = useCallback(async () => {
    if (!isDeviceAdapterEnabled || !enableVisualization) return;
    try {
      await ensureStreamWithVisualization();
      if (isMountedRef.current) {
        setIsMonitoring(true);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start input monitoring';
      setError(message);
      maybeMarkUserActivationRequired(message);
      onErrorRef.current?.(err instanceof Error ? err : new Error(message));
    }
  }, [enableVisualization, isDeviceAdapterEnabled, ensureStreamWithVisualization, maybeMarkUserActivationRequired]);

  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false);

    const isBusy =
      (mode === 'realtime' && (realtime.state === 'recording' || realtime.state === 'starting' || realtime.state === 'stopping')) ||
      (mode === 'async' && (localState === 'recording' || async_.state === 'uploading' || async_.state === 'processing'));

    // If recording/processing, keep visualization/stream for the active session.
    // Cleanup happens when the session completes or is cancelled.
    if (isBusy) {
      return;
    }

    disconnectVisualizationSafe();
    if (isDeviceAdapterEnabled) {
      stopAudioStream();
    }
  }, [async_.state, disconnectVisualizationSafe, isDeviceAdapterEnabled, localState, mode, realtime.state, stopAudioStream]);

  /**
   * Cleanup local recording resources
   * Order matters: disconnect visualization FIRST (while stream is still active),
   * then stop recorder, then stop tracks
   */
  const cleanupLocalRecording = useCallback(() => {
    // Stop duration timer
    if (durationIntervalRef.current !== null) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    // Disconnect visualization FIRST (while stream is still active)
    // Keep visualization if the user is explicitly monitoring input.
    if (!isMonitoringRef.current) {
      disconnectVisualizationSafe();
    }

    // Stop media recorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // Ignore if already stopped
      }
    }
    mediaRecorderRef.current = null;

    // Stop media stream tracks LAST
    if (mediaStreamRef.current) {
      // If stream is managed by audioStreamManager, stop it there (unless monitoring)
      if (isDeviceAdapterEnabled) {
        if (!isMonitoringRef.current) {
          stopAudioStream();
        }
      } else {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      mediaStreamRef.current = null;
    }

    // Clear audio chunks (but NOT audioDataRef/audio format - those are cached for completion flow)
    audioChunksRef.current = [];
  }, [disconnectVisualizationSafe, isDeviceAdapterEnabled, stopAudioStream]);

  const getRecorderMimeType = useCallback((): string | null => {
    if (typeof MediaRecorder === 'undefined') return null;
    const candidates = [
      'audio/mp4;codecs=mp4a.40.2',
      'audio/mp4',
      'audio/aac',
      'audio/webm;codecs=opus',
      'audio/webm',
    ];
    for (const mimeType of candidates) {
      if (MediaRecorder.isTypeSupported(mimeType)) {
        return mimeType;
      }
    }
    return null;
  }, []);

  const startRealtimeCapture = useCallback((stream: MediaStream) => {
    if (!settings.saveAudioFiles) return;
    const mimeType = getRecorderMimeType();
    if (!mimeType) return;
    if (realtimeRecorderRef.current) return;

    try {
      const recorder = new MediaRecorder(stream, { mimeType });
      realtimeRecorderRef.current = recorder;
      realtimeAudioFormatRef.current = recordingFormatFromMimeType(mimeType);
      realtimeChunksRef.current = [];
      realtimeAudioDataRef.current = null;
      realtimeStopPromiseRef.current = new Promise((resolve) => {
        recorder.onstop = async () => {
          try {
            const blob = new Blob(realtimeChunksRef.current, { type: recorder.mimeType });
            const buffer = await blob.arrayBuffer();
            realtimeAudioDataRef.current = buffer;
            resolve(buffer);
          } catch (err) {
            console.warn('[useRecordingSession] Failed to finalize realtime audio:', err);
            resolve(null);
          }
        };
      });

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          realtimeChunksRef.current.push(event.data);
        }
      };

      recorder.start(100);
    } catch (err) {
      console.warn('[useRecordingSession] Failed to start realtime audio capture:', err);
    }
  }, [getRecorderMimeType, settings.saveAudioFiles]);

  const stopRealtimeCapture = useCallback(async (): Promise<ArrayBuffer | null> => {
    if (!settings.saveAudioFiles) return null;
    const recorder = realtimeRecorderRef.current;
    if (!recorder) return realtimeAudioDataRef.current;

    try {
      if (recorder.state !== 'inactive') {
        recorder.stop();
      }
    } catch {
      // Ignore stop errors
    }

    const stopPromise = realtimeStopPromiseRef.current;
    const data = stopPromise ? await stopPromise : realtimeAudioDataRef.current;
    realtimeRecorderRef.current = null;
    realtimeStopPromiseRef.current = null;
    realtimeChunksRef.current = [];
    return data ?? null;
  }, [settings.saveAudioFiles]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupLocalRecording();
      if (realtimeRecorderRef.current && realtimeRecorderRef.current.state !== 'inactive') {
        try {
          realtimeRecorderRef.current.stop();
        } catch {
          // Ignore
        }
      }
      realtimeRecorderRef.current = null;
      realtimeChunksRef.current = [];
      realtimeAudioDataRef.current = null;
      realtimeStopPromiseRef.current = null;
      realtimeAudioFormatRef.current = undefined;
      disconnectVisualizationSafe();
      stopAudioStream();
    };
  }, [cleanupLocalRecording, disconnectVisualizationSafe, stopAudioStream]);

  /**
   * Start local recording (async mode)
   */
  const startLocalRecording = useCallback(async () => {
    if (localState !== 'idle') return;

    // Capture target app name
    if (textInputAdapter?.getFocusedAppName) {
      try {
        targetAppNameRef.current = await textInputAdapter.getFocusedAppName();
      } catch {
        targetAppNameRef.current = null;
      }
    }

    try {
      // Get microphone stream (prefer configured deviceAdapter when available)
      const stream = isDeviceAdapterEnabled
        ? await ensureStreamWithVisualization()
        : await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
          });

      mediaStreamRef.current = stream;

      // Connect to visualization (if not already monitoring)
      if (!effectiveVisualizationActive) {
        connectVisualizationSafe(stream);
      }

      // Create MediaRecorder
      const mimeType = getRecorderMimeType();
      if (!mimeType) {
        throw new Error('No supported audio recording format found');
      }

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      localAudioFormatRef.current = recordingFormatFromMimeType(mimeType);

      // Collect audio chunks
      audioChunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      // Start recording
      recorder.start(100); // Collect data every 100ms
      recordingStartRef.current = Date.now();
      setLocalState('recording');
      setDuration(0);
      setError(null);

      // Start duration timer
      durationIntervalRef.current = window.setInterval(() => {
        if (recordingStartRef.current && isMountedRef.current) {
          setDuration((Date.now() - recordingStartRef.current) / 1000);
        }
      }, 100);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start recording';
      setError(message);
      onErrorRef.current?.(err instanceof Error ? err : new Error(message));
      cleanupLocalRecording();
    }
  }, [
    connectVisualizationSafe,
    ensureStreamWithVisualization,
    effectiveVisualizationActive,
    getRecorderMimeType,
    isDeviceAdapterEnabled,
    localState,
    textInputAdapter,
    cleanupLocalRecording,
  ]);

  /**
   * Stop local recording and get audio data
   * Caches audio data in audioDataRef to avoid race conditions with async completion
   */
  const stopLocalRecording = useCallback(async (): Promise<ArrayBuffer | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current || localState !== 'recording') {
        resolve(null);
        return;
      }

      const recorder = mediaRecorderRef.current;
      const mimeType = recorder.mimeType;

      recorder.onstop = async () => {
        // Combine audio chunks BEFORE cleanup (cleanup clears audioChunksRef)
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        const arrayBuffer = await blob.arrayBuffer();

        // Cache audio data for later use (Fix #1: race condition)
        audioDataRef.current = arrayBuffer;

        // Use centralized cleanup (Fix #6: DRY)
        cleanupLocalRecording();

        setLocalState('stopped');
        resolve(arrayBuffer);
      };

      // Request final data and stop
      if (recorder.state === 'recording') {
        recorder.stop();
      } else {
        resolve(null);
      }
    });
  }, [localState, cleanupLocalRecording]);

  /**
   * Execute auto-actions based on settings
   */
  const executeAutoActions = useCallback(
    async (
      text: string,
      audioData?: ArrayBuffer,
      audioFormat?: string
    ): Promise<VoiceRecordingResult> => {
      const recordingDuration = recordingStartRef.current
        ? (Date.now() - recordingStartRef.current) / 1000
        : duration;

      const result: VoiceRecordingResult = {
        text,
        duration: recordingDuration,
        audioData,
        wasInserted: false,
        wasCopied: false,
        wasSaved: false,
      };

      const { outputDestination, autoHideAfterRecording, autoHideDelayMs, saveAudioFiles } =
        settings;

      // Persist history first so transcript durability does not depend on insert/copy/window-focus actions.
      let audioUri: string | undefined;
      if (saveAudioFiles && audioData && audioAdapter) {
        try {
          audioUri = await audioAdapter.saveRecordedAudio(audioData, {
            duration: recordingDuration,
            timestamp: Date.now(),
            format: audioFormat ?? 'webm',
          });
        } catch (err) {
          console.error('Failed to save audio file:', err);
        }
      }

      try {
        const entry = await addEntry(text, 'live', recordingDuration, {
          engine: engineId,
          model: transcriptionModel,
          language: languageHints[0],
          audioUri,
          recordingMode: mode,
        });
        result.wasSaved = true;
        result.entryId = entry.id;
      } catch (err) {
        console.error('Failed to save to history:', err);
      }

      const shouldReleaseFocusForOutput =
        (shouldInsert(outputDestination) || shouldCopy(outputDestination)) &&
        Boolean(systemAdapter?.hideVoiceWindow);

      // In the floating voice window, we often need to release focus back to the target app
      // before we can insert/paste successfully. We hide the panel temporarily and then (optionally)
      // restore it, depending on the user's auto-hide setting.
      let didTemporarilyHide = false;
      if (shouldReleaseFocusForOutput) {
        try {
          await systemAdapter?.hideVoiceWindow?.();
          didTemporarilyHide = true;
          // Give the OS a moment to restore focus to the previously active app.
          await new Promise((r) => setTimeout(r, 120));
        } catch {
          // Ignore focus release failures; insertion may still work if focus is already correct.
        }
      }

      // Execute based on output destination
      if (shouldInsert(outputDestination) && textInputAdapter) {
        try {
          result.wasInserted = await textInputAdapter.insertText(text);
        } catch (err) {
          console.error('Auto-insert failed:', err);
        }
      }

      // If the user requested insert-only (or insert as part of both) but direct insertion failed,
      // in the floating voice window we fall back to clipboard so the user still gets output.
      if (
        shouldInsert(outputDestination) &&
        !result.wasInserted &&
        didTemporarilyHide &&
        systemAdapter &&
        !shouldCopy(outputDestination)
      ) {
        try {
          await systemAdapter.copyToClipboard(text);
          result.wasCopied = true;
        } catch (err) {
          console.error('Fallback clipboard copy failed:', err);
        }
      }

      if (shouldCopy(outputDestination) && systemAdapter) {
        try {
          await systemAdapter.copyToClipboard(text);
          result.wasCopied = true;
        } catch (err) {
          console.error('Auto-copy failed:', err);
        }
      }

      // Auto-hide window
      if (autoHideAfterRecording && systemAdapter?.hideVoiceWindow) {
        setTimeout(() => {
          systemAdapter.hideVoiceWindow?.();
        }, autoHideDelayMs);
      }

      // If we hid the window just to release focus, and the user doesn't want auto-hide,
      // bring it back after output actions complete.
      if (didTemporarilyHide && !autoHideAfterRecording && systemAdapter?.showVoiceWindow) {
        setTimeout(() => {
          systemAdapter.showVoiceWindow?.();
        }, 250);
      }

      return result;
    },
    [
      duration,
      settings,
      textInputAdapter,
      systemAdapter,
      audioAdapter,
      addEntry,
      languageHints,
      mode,
      engineId,
      transcriptionModel,
    ]
  );

  /**
   * Start recording (mode-aware)
   */
  const startRecording = useCallback(async () => {
    setError(null);

    try {
      if (mode === 'realtime') {
        if (isDeviceAdapterEnabled) {
          // Ensure mic permission + stream is created and visualization is attached before starting STT capture.
          if (!hasAudioPermission) {
            const granted = await requestAudioPermission();
            if (!granted) {
              throw new Error('Microphone permission denied');
            }
          }
          const stream = await ensureStreamWithVisualization();
          startRealtimeCapture(stream);
        }
        await realtime.startRecording();
      } else {
        await startLocalRecording();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start recording';
      setError(message);
      maybeMarkUserActivationRequired(message);
      onErrorRef.current?.(err instanceof Error ? err : new Error(message));
    }
  }, [
    ensureStreamWithVisualization,
    hasAudioPermission,
    isDeviceAdapterEnabled,
    mode,
    realtime,
    requestAudioPermission,
    startLocalRecording,
    startRealtimeCapture,
    maybeMarkUserActivationRequired,
  ]);

  /**
   * Stop recording (mode-aware)
   */
  const stopRecording = useCallback(async () => {
    if (mode === 'realtime') {
      // Just stop recording - the useEffect below will handle completion
      // when realtime.state becomes 'completed' (Fix #3: no setTimeout race)
      realtimeStopPromiseRef.current = stopRealtimeCapture();
      await realtime.stopRecording();
    } else {
      // Async mode: stop recording, then transcribe
      const audioData = await stopLocalRecording();

      if (audioData && audioData.byteLength > 0) {
        // Start async transcription
        const ext = localAudioFormatRef.current ?? 'webm';
        const fileName = `recording-${Date.now()}.${ext}`;
        await async_.transcribe(audioData, fileName);

        // The async hook will handle completion
        // We need to watch for completion to execute auto-actions
      } else {
        setError('No audio data recorded');
        setLocalState('idle');
      }
    }
  }, [mode, realtime, stopRealtimeCapture, stopLocalRecording, async_]);

  // Watch for realtime transcription completion (Fix #3: replaces setTimeout race condition)
  useEffect(() => {
    if (mode === 'realtime' && realtime.state === 'completed' && !realtimeCompletedRef.current) {
      realtimeCompletedRef.current = true;

      const execute = async () => {
        const text = realtime.finalText.trim();
        const audioData =
          realtimeAudioDataRef.current ??
          (realtimeStopPromiseRef.current ? await realtimeStopPromiseRef.current : null);

        realtimeAudioDataRef.current = null;
        realtimeStopPromiseRef.current = null;
        if (isMountedRef.current) {
          if (text) {
            const result = await executeAutoActions(
              text,
              audioData ?? undefined,
              realtimeAudioFormatRef.current
            );
            onCompletedRef.current?.(result);
          } else {
            // Provide feedback even when no speech is detected.
            const recordingDuration = recordingStartRef.current
              ? (Date.now() - recordingStartRef.current) / 1000
              : 0;
            onCompletedRef.current?.({
              text: '',
              duration: recordingDuration,
              audioData: audioData ?? undefined,
              wasInserted: false,
              wasCopied: false,
              wasSaved: false,
            });
          }
        }

        // Release resources unless the user is monitoring input.
        if (!isMonitoringRef.current) {
          disconnectVisualizationSafe();
          if (isDeviceAdapterEnabled) {
            stopAudioStream();
          }
        }
      };

      execute();
    }

    // Reset the flag when we start a new recording
    if (mode === 'realtime' && realtime.state === 'recording') {
      realtimeCompletedRef.current = false;
    }
  }, [disconnectVisualizationSafe, executeAutoActions, isDeviceAdapterEnabled, mode, realtime.finalText, realtime.state, stopAudioStream]);

  useEffect(() => {
    if (mode === 'realtime' && realtime.state === 'error') {
      void stopRealtimeCapture();
      realtimeChunksRef.current = [];
      realtimeAudioDataRef.current = null;
      realtimeStopPromiseRef.current = null;
      realtimeAudioFormatRef.current = undefined;
    }
  }, [mode, realtime.state, stopRealtimeCapture]);


  // Watch for async transcription completion
  useEffect(() => {
    if (mode === 'async' && async_.state === 'completed') {
      setAsyncFinalText(async_.finalText ?? '');

      // Execute auto-actions using cached audio data (Fix #1: audioDataRef instead of audioChunksRef)
      const execute = async () => {
        // Use cached audio data - audioChunksRef is cleared by cleanupLocalRecording
        const audioData = audioDataRef.current ?? undefined;

        const text = (async_.finalText ?? '').trim();
        if (text) {
          const result = await executeAutoActions(text, audioData, localAudioFormatRef.current);
          onCompletedRef.current?.(result);
        } else {
          const recordingDuration = recordingStartRef.current
            ? (Date.now() - recordingStartRef.current) / 1000
            : duration;
          onCompletedRef.current?.({
            text: '',
            duration: recordingDuration,
            audioData,
            wasInserted: false,
            wasCopied: false,
            wasSaved: false,
          });
        }

        // Reset local state and clear cached audio data
        setLocalState('idle');
        audioDataRef.current = null;
        localAudioFormatRef.current = undefined;

        // Release resources unless the user is monitoring input.
        if (!isMonitoringRef.current) {
          disconnectVisualizationSafe();
          if (isDeviceAdapterEnabled) {
            stopAudioStream();
          }
        }
      };

      execute();
    }
  }, [async_.finalText, async_.state, disconnectVisualizationSafe, executeAutoActions, isDeviceAdapterEnabled, mode, stopAudioStream]);

  // Watch for async errors
  useEffect(() => {
    if (mode === 'async' && async_.state === 'error' && async_.error) {
      setError(async_.error);
      setLocalState('idle');
      onErrorRef.current?.(new Error(async_.error));
    }
  }, [mode, async_.state, async_.error]);

  /**
   * Cancel recording
   */
  const cancelRecording = useCallback(() => {
    if (mode === 'realtime') {
      realtime.reset();
      void stopRealtimeCapture();
      realtimeChunksRef.current = [];
      realtimeAudioDataRef.current = null;
      realtimeStopPromiseRef.current = null;
      realtimeAudioFormatRef.current = undefined;
      if (!isMonitoringRef.current) {
        disconnectVisualizationSafe();
        if (isDeviceAdapterEnabled) {
          stopAudioStream();
        }
      }
    } else {
      cleanupLocalRecording();
      async_.abort();
      setLocalState('idle');
      setDuration(0);
      localAudioFormatRef.current = undefined;
    }
  }, [async_, cleanupLocalRecording, disconnectVisualizationSafe, isDeviceAdapterEnabled, mode, realtime, stopAudioStream, stopRealtimeCapture]);

  /**
   * Reset to idle state
   */
  const reset = useCallback(() => {
    if (mode === 'realtime') {
      realtime.reset();
      void stopRealtimeCapture();
      realtimeChunksRef.current = [];
      realtimeAudioDataRef.current = null;
      realtimeStopPromiseRef.current = null;
      realtimeAudioFormatRef.current = undefined;
      if (!isMonitoringRef.current) {
        disconnectVisualizationSafe();
        if (isDeviceAdapterEnabled) {
          stopAudioStream();
        }
      }
    } else {
      cleanupLocalRecording();
      async_.reset();
      setLocalState('idle');
      setDuration(0);
      setAsyncFinalText('');
      localAudioFormatRef.current = undefined;
    }
    setError(null);
  }, [async_, cleanupLocalRecording, disconnectVisualizationSafe, isDeviceAdapterEnabled, mode, realtime, stopAudioStream, stopRealtimeCapture]);

  /**
   * Insert text into focused app
   */
  const insertText = useCallback(async (): Promise<boolean> => {
    const text = mode === 'realtime' ? realtime.finalText : asyncFinalText;
    if (!text || !textInputAdapter) {
      return false;
    }

    try {
      return await textInputAdapter.insertText(text);
    } catch (err) {
      console.error('Failed to insert text:', err);
      return false;
    }
  }, [mode, realtime.finalText, asyncFinalText, textInputAdapter]);

  /**
   * Copy text to clipboard
   */
  const copyToClipboard = useCallback(async (): Promise<void> => {
    const text = mode === 'realtime' ? realtime.finalText : asyncFinalText;
    if (!text || !systemAdapter) {
      return;
    }

    try {
      await systemAdapter.copyToClipboard(text);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  }, [mode, realtime.finalText, asyncFinalText, systemAdapter]);

  // Compute unified state
  const state = useMemo<SessionState>(() => {
    if (mode === 'realtime') {
      return recordingStateToSession(realtime.state);
    } else {
      // Async mode combines local recording state and async transcription state
      if (localState === 'recording') {
        return 'recording';
      } else if (localState === 'stopped' || async_.state === 'uploading' || async_.state === 'processing') {
        return 'processing';
      } else if (async_.state === 'completed') {
        return 'completed';
      } else if (async_.state === 'error' || error) {
        return 'error';
      }
      return 'idle';
    }
  }, [mode, realtime.state, localState, async_.state, error]);

  // Compute display state
  const displayState = useMemo<TranscriptDisplayState>(() => {
    if (mode === 'realtime') {
      return realtime.displayState;
    } else {
      // For async mode, create display state from final text
      if (asyncFinalText) {
        return createTranscriptDisplayState(
          [{
            text: asyncFinalText,
            words: [],
            isFinal: true,
            finalAudioProcMs: 0,
            totalAudioProcMs: 0,
          }],
          null
        );
      }
      return createTranscriptDisplayState([], null);
    }
  }, [mode, realtime.displayState, asyncFinalText]);

  const hasAudioSignal = effectiveVisualizationActive && effectiveVisualization.volume > 0.015;

  return {
    state,
    mode,
    isRecording: state === 'recording',
    isProcessing: state === 'processing',
    progress: mode === 'async' ? async_.progress : 0,
    duration: mode === 'realtime'
      ? (recordingStartRef.current ? (Date.now() - recordingStartRef.current) / 1000 : 0)
      : duration,
    finalText: mode === 'realtime' ? realtime.finalText : asyncFinalText,
    partialText: mode === 'realtime' ? realtime.partialText : '',
    displayState,
    visualization: effectiveVisualization,
    error: error ?? (mode === 'realtime' ? realtime.error : async_.error),
    audioDevices,
    selectedAudioDeviceId,
    hasAudioPermission,
    audioStreamState,
    requestAudioPermission,
    selectAudioDevice,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    hasAudioSignal,
    requiresUserActivation,
    clearUserActivationRequirement,
    startRecording,
    stopRecording,
    cancelRecording,
    reset,
    insertText,
    copyToClipboard,
  };
}

/**
 * Check if should insert based on output destination
 */
function shouldInsert(dest: VoiceOutputDestination): boolean {
  return dest === 'insert' || dest === 'both';
}

/**
 * Check if should copy based on output destination
 */
function shouldCopy(dest: VoiceOutputDestination): boolean {
  return dest === 'clipboard' || dest === 'both';
}

function recordingFormatFromMimeType(mimeType?: string): string {
  if (!mimeType) return 'webm';
  const mime = mimeType.toLowerCase();
  if (mime.includes('audio/mp4') || mime.includes('audio/aac')) return 'mp4';
  if (mime.includes('audio/ogg')) return 'ogg';
  if (mime.includes('audio/mpeg') || mime.includes('audio/mp3')) return 'mp3';
  if (mime.includes('audio/wav')) return 'wav';
  return 'webm';
}
