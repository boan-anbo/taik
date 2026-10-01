/**
 * Record Screen
 * Real-time speech-to-text recording with Soniox
 */

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  useRecording,
  useSettingsStore,
  useTranscriptStore,
  useVoiceStore,
  getSonioxApiKey,
  useAudioStreamManager,
} from '@taik/domain';
import { tokens } from '@taik/ui-tokens';
import { TranscriptDisplay } from '@taik/ui-dom';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { useHotkeyEvent, HOTKEY_EVENTS, DEFAULT_HOTKEYS } from '../hooks';
import { BrowserMediaDeviceAdapter } from '@taik/platform-web';
import { TauriAudioAdapter } from '../adapters/TauriAudioAdapter';

const AUDIO_CAPTURE_TIMEOUT_MS = 1500;

function recordingFormatFromMimeType(mimeType?: string): string {
  if (!mimeType) return 'webm';
  const mime = mimeType.toLowerCase();
  if (mime.includes('audio/mp4') || mime.includes('audio/aac')) return 'mp4';
  if (mime.includes('audio/ogg')) return 'ogg';
  if (mime.includes('audio/mpeg') || mime.includes('audio/mp3')) return 'mp3';
  if (mime.includes('audio/wav')) return 'wav';
  return 'webm';
}

export function RecordScreen() {
  const { engineSettings } = useSettingsStore();
  const { settings: voiceSettings } = useVoiceStore();
  const { addEntry } = useTranscriptStore();
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);
  const [autoSaveNotice, setAutoSaveNotice] = useState<string | null>(null);

  const activeStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const capturedAudioDataRef = useRef<ArrayBuffer | null>(null);
  const stopAudioCapturePromiseRef = useRef<Promise<ArrayBuffer | null> | null>(null);
  const capturedAudioFormatRef = useRef<string>('webm');
  const didAutoSaveRef = useRef(false);
  const audioAdapterRef = useRef(new TauriAudioAdapter());

  const getRecorderMimeType = (): string | undefined => {
    if (typeof MediaRecorder === 'undefined') return undefined;
    const candidates = [
      'audio/mp4;codecs=mp4a.40.2',
      'audio/mp4',
      'audio/aac',
      'audio/webm;codecs=opus',
      'audio/webm',
    ];
    return candidates.find((mime) => MediaRecorder.isTypeSupported(mime));
  };

  const startAudioCapture = useCallback((captureStream: MediaStream) => {
    if (!voiceSettings.saveAudioFiles) return;
    if (mediaRecorderRef.current?.state === 'recording') return;

    try {
      const mimeType = getRecorderMimeType();
      const recorder = mimeType
        ? new MediaRecorder(captureStream, { mimeType })
        : new MediaRecorder(captureStream);

      audioChunksRef.current = [];
      capturedAudioDataRef.current = null;
      stopAudioCapturePromiseRef.current = null;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.start(100);
      mediaRecorderRef.current = recorder;
      capturedAudioFormatRef.current = recordingFormatFromMimeType(recorder.mimeType || mimeType);
    } catch (err) {
      console.error('[RecordScreen] Failed to start local audio capture:', err);
    }
  }, [voiceSettings.saveAudioFiles]);

  const stopAudioCapture = useCallback(async (): Promise<ArrayBuffer | null> => {
    if (capturedAudioDataRef.current) return capturedAudioDataRef.current;
    if (stopAudioCapturePromiseRef.current) return stopAudioCapturePromiseRef.current;

    const recorder = mediaRecorderRef.current;
    if (!recorder) return null;

    stopAudioCapturePromiseRef.current = new Promise((resolve) => {
      const finalize = async () => {
        try {
          if (!audioChunksRef.current.length) {
            resolve(null);
            return;
          }
          const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
          const audioData = await blob.arrayBuffer();
          capturedAudioDataRef.current = audioData.byteLength > 0 ? audioData : null;
          resolve(capturedAudioDataRef.current);
        } catch (err) {
          console.error('[RecordScreen] Failed to finalize audio capture:', err);
          resolve(null);
        } finally {
          mediaRecorderRef.current = null;
          audioChunksRef.current = [];
          stopAudioCapturePromiseRef.current = null;
        }
      };

      recorder.onstop = () => {
        void finalize();
      };

      if (recorder.state !== 'inactive') {
        recorder.stop();
      } else {
        void finalize();
      }
    });

    return stopAudioCapturePromiseRef.current;
  }, []);

  const stopAudioCaptureWithTimeout = useCallback(
    async (timeoutMs = AUDIO_CAPTURE_TIMEOUT_MS): Promise<ArrayBuffer | null> => {
      const capturePromise = stopAudioCapture().catch(() => null);
      const timeoutPromise = new Promise<null>((resolve) => {
        window.setTimeout(() => resolve(null), timeoutMs);
      });

      const data = await Promise.race<ArrayBuffer | null>([capturePromise, timeoutPromise]);
      if (data && data.byteLength > 0) return data;
      return capturedAudioDataRef.current;
    },
    [stopAudioCapture]
  );

  const deviceAdapter = useMemo(() => new BrowserMediaDeviceAdapter(), []);
  const { stream, startStream, stopStream, hasPermission, requestPermission } = useAudioStreamManager({
    deviceAdapter,
    autoRequestPermission: false,
  });

  // Use getSonioxApiKey for backwards compatibility with old settings
  const sonioxApiKey = getSonioxApiKey(engineSettings);

  const {
    state,
    finalText,
    displayState,
    error,
    startRecording,
    stopRecording,
    reset,
  } = useRecording({
    apiKey: sonioxApiKey,
    languageHints: engineSettings.languageHints,
    finalizeTimeoutMs: engineSettings.soniox?.finalizeTimeoutMs,
    finalizeMinWaitMs: engineSettings.soniox?.finalizeMinWaitMs,
    getMediaStream: async () => {
      if (!hasPermission) {
        await requestPermission();
      }
      const nextStream = stream ?? (await startStream());
      activeStreamRef.current = nextStream;
      return nextStream;
    },
    stopStreamOnStop: false,
    onTranscript: (result) => {
      if (!import.meta.env.DEV) return;
      console.log('[soniox] transcript', {
        isFinal: result.isFinal,
        chars: result.text.length,
        words: result.words.length,
        finalAudioProcMs: result.finalAudioProcMs,
        totalAudioProcMs: result.totalAudioProcMs,
      });
    },
    onStart: () => {
      setRecordingStartTime(Date.now());
      setAutoSaveNotice(null);
      didAutoSaveRef.current = false;
      const captureStream = activeStreamRef.current ?? stream;
      if (captureStream) {
        startAudioCapture(captureStream);
      }
    },
    onStop: () => {
      void stopAudioCaptureWithTimeout()
        .then((data) => {
          capturedAudioDataRef.current = data;
        })
        .finally(() => {
          stopStream();
        });
    },
    onError: (err) => {
      console.error('Recording error:', err);
      void stopAudioCaptureWithTimeout();
      stopStream();
    },
  });

  const handleMicPress = useCallback(async () => {
    if (state === 'recording') {
      await stopRecording();
    } else if (state === 'idle' || state === 'completed' || state === 'error') {
      if (state === 'completed' || state === 'error') {
        reset();
      }
      didAutoSaveRef.current = false;
      setAutoSaveNotice(null);
      await startRecording();
    }
  }, [state, reset, startRecording, stopRecording]);

  // Listen for global hotkey to toggle recording
  useHotkeyEvent(HOTKEY_EVENTS.toggleRecording, handleMicPress);

  const handleCopyToClipboard = useCallback(async () => {
    if (finalText) {
      await writeText(finalText);
    }
  }, [finalText]);

  useEffect(() => {
    if (state !== 'completed') return;
    if (didAutoSaveRef.current) return;

    const text = finalText.trim();
    if (!text) return;

    didAutoSaveRef.current = true;

    const persist = async () => {
      const duration = recordingStartTime ? (Date.now() - recordingStartTime) / 1000 : 0;
      let audioUri: string | undefined;

      let audioData = capturedAudioDataRef.current;
      if (!audioData && voiceSettings.saveAudioFiles) {
        audioData = await stopAudioCaptureWithTimeout();
      }

      if (voiceSettings.saveAudioFiles && audioData && audioData.byteLength > 0) {
        try {
          audioUri = await audioAdapterRef.current.saveRecordedAudio(audioData, {
            duration,
            timestamp: Date.now(),
            format: capturedAudioFormatRef.current,
          });
        } catch (err) {
          console.error('[RecordScreen] Failed to save recording audio:', err);
        }
      }

      try {
        await addEntry(text, 'live', duration, {
          engine: 'soniox',
          language: engineSettings.languageHints[0],
          audioUri,
          recordingMode: 'realtime',
        });
        setAutoSaveNotice(audioUri ? 'Saved to history with audio.' : 'Saved to history.');
      } catch (err) {
        didAutoSaveRef.current = false;
        setAutoSaveNotice('Failed to save to history.');
        console.error('[RecordScreen] Failed to save transcript to history:', err);
      }
    };

    void persist();
  }, [
    state,
    finalText,
    recordingStartTime,
    stopAudioCaptureWithTimeout,
    voiceSettings.saveAudioFiles,
    addEntry,
    engineSettings.languageHints,
  ]);

  useEffect(() => {
    return () => {
      void stopAudioCapture();
    };
  }, [stopAudioCapture]);

  const getStatusText = (): string => {
    const hotkeyHint = `(${DEFAULT_HOTKEYS.toggleRecording.replace('CommandOrControl', 'Cmd')})`;
    switch (state) {
      case 'starting':
        return 'Starting...';
      case 'recording':
        return `Listening... Click or press ${hotkeyHint} to stop`;
      case 'stopping':
        return 'Finalizing...';
      case 'completed':
        return `Click or press ${hotkeyHint} to record again`;
      case 'error':
        return 'Error occurred. Click to retry';
      default:
        return `Click or press ${hotkeyHint} to start recording`;
    }
  };

  const getMicButtonStyle = (): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      width: 100,
      height: 100,
      borderRadius: '50%',
      border: 'none',
      cursor: state === 'starting' || state === 'stopping' ? 'wait' : 'pointer',
      fontSize: 32,
      transition: 'all 0.2s ease',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    };

    switch (state) {
      case 'recording':
        return {
          ...baseStyle,
          backgroundColor: tokens.color.recording,
          color: 'white',
          animation: 'pulse 1.5s infinite',
        };
      case 'stopping':
        return {
          ...baseStyle,
          backgroundColor: tokens.color.processing,
          color: 'white',
        };
      default:
        return {
          ...baseStyle,
          backgroundColor: tokens.color.brand,
          color: 'white',
        };
    }
  };

  const hasApiKey = sonioxApiKey.trim() !== '';

  return (
    <div className="screen" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="screen-header">
        <h1 className="screen-title">Record</h1>
      </div>

      <div
        style={{
          flex: 1,
          backgroundColor: tokens.color.surface,
          borderRadius: tokens.radius.md,
          padding: tokens.space.xl,
          marginBottom: tokens.space.xl,
          overflow: 'auto',
        }}
      >
        <TranscriptDisplay
          displayState={displayState}
          showConfidence={true}
          emptyMessage={
            hasApiKey
              ? 'Your transcription will appear here...'
              : 'Please configure your Soniox API key in Settings to start recording.'
          }
        />
      </div>

      {error && (
        <div
          style={{
            backgroundColor: tokens.color.dangerSurface,
            padding: tokens.space.lg,
            borderRadius: tokens.radius.md,
            marginBottom: tokens.space.lg,
          }}
        >
          <p style={{ color: tokens.color.danger, fontSize: tokens.fontSize.sm }}>
            {error}
          </p>
        </div>
      )}

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: tokens.space.lg,
          paddingBottom: tokens.space.xl,
        }}
      >
        <p style={{ color: tokens.color.textSubtle, fontSize: tokens.fontSize.md }}>
          {getStatusText()}
        </p>

        <button
          onClick={handleMicPress}
          disabled={state === 'starting' || state === 'stopping' || !hasApiKey}
          style={getMicButtonStyle()}
          aria-label={state === 'recording' ? 'Stop recording' : 'Start recording'}
        >
          {state === 'recording' ? '⏹' : '🎙'}
        </button>

        {autoSaveNotice && (
          <p
            style={{
              marginTop: tokens.space.sm,
              fontSize: tokens.fontSize.sm,
              color: autoSaveNotice.startsWith('Failed') ? tokens.color.danger : tokens.color.textSubtle,
            }}
          >
            {autoSaveNotice}
          </p>
        )}

        {finalText && state === 'completed' && (
          <div style={{ display: 'flex', gap: tokens.space.md, marginTop: tokens.space.lg }}>
            <button
              onClick={handleCopyToClipboard}
              style={{
                backgroundColor: tokens.color.brand,
                color: 'white',
                padding: `${tokens.space.md}px ${tokens.space.xxl}px`,
                borderRadius: tokens.radius.md,
                border: 'none',
                fontSize: tokens.fontSize.md,
                fontWeight: tokens.fontWeight.semibold,
              }}
            >
              Copy to Clipboard
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
