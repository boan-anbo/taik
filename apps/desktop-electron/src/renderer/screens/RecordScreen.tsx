/**
 * Record Screen
 * Real-time speech-to-text recording with Soniox
 */

import { useState, useCallback, useMemo } from 'react';
import { useRecording, useSettingsStore, useTranscriptStore, getSonioxApiKey, useAudioStreamManager } from '@taik/domain';
import { tokens } from '@taik/ui-tokens';
import { TranscriptDisplay } from '@taik/ui-dom';
import { useHotkeyEvent, HOTKEY_EVENTS, DEFAULT_HOTKEYS } from '../hooks';
import { BrowserMediaDeviceAdapter } from '@taik/platform-web';
import { systemAdapter } from '../platform/system';

export function RecordScreen() {
  const { engineSettings } = useSettingsStore();
  const { addEntry } = useTranscriptStore();
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);

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
      return stream ?? (await startStream());
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
    },
    onStop: () => {
      // Recording stopped
      stopStream();
    },
    onError: (err) => {
      console.error('Recording error:', err);
      stopStream();
    },
  });

  const handleMicPress = useCallback(async () => {
    if (state === 'recording') {
      await stopRecording();
    } else if (state === 'idle' || state === 'completed' || state === 'error') {
      await startRecording();
    }
  }, [state, startRecording, stopRecording]);

  // Listen for global hotkey to toggle recording
  useHotkeyEvent(HOTKEY_EVENTS.toggleRecording, handleMicPress);

  const handleCopyToClipboard = useCallback(async () => {
    if (finalText) {
      await systemAdapter.copyToClipboard(finalText);
      // Could show a toast notification here
    }
  }, [finalText]);

  const handleSaveTranscript = useCallback(async () => {
    if (finalText && recordingStartTime) {
      const duration = (Date.now() - recordingStartTime) / 1000;
      await addEntry(finalText, 'live', duration, {
        engine: 'soniox',
        language: engineSettings.languageHints[0],
      });
      reset();
    }
  }, [finalText, recordingStartTime, addEntry, engineSettings.languageHints, reset]);

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

      {/* Transcript Area */}
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

      {/* Error Message */}
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
          {error.toLowerCase().includes('microphone permission denied') && (
            <div style={{ marginTop: tokens.space.sm, display: 'flex', gap: tokens.space.sm, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => void systemAdapter.openMicrophonePrivacySettings()}
                style={{
                  backgroundColor: tokens.color.surface,
                  color: tokens.color.text,
                  padding: `${tokens.space.xs}px ${tokens.space.md}px`,
                  borderRadius: tokens.radius.sm,
                  border: `1px solid ${tokens.color.borderSubtle}`,
                  fontSize: tokens.fontSize.sm,
                  cursor: 'pointer',
                }}
              >
                Open Microphone Settings
              </button>
              <button
                type="button"
                onClick={() => void systemAdapter.restart()}
                style={{
                  backgroundColor: tokens.color.surface,
                  color: tokens.color.text,
                  padding: `${tokens.space.xs}px ${tokens.space.md}px`,
                  borderRadius: tokens.radius.sm,
                  border: `1px solid ${tokens.color.borderSubtle}`,
                  fontSize: tokens.fontSize.sm,
                  cursor: 'pointer',
                }}
              >
                Restart Taik
              </button>
              <button
                type="button"
                onClick={() => void requestPermission()}
                style={{
                  backgroundColor: tokens.color.brand,
                  color: 'white',
                  padding: `${tokens.space.xs}px ${tokens.space.md}px`,
                  borderRadius: tokens.radius.sm,
                  border: 'none',
                  fontSize: tokens.fontSize.sm,
                  cursor: 'pointer',
                }}
              >
                Retry
              </button>
            </div>
          )}
        </div>
      )}

      {/* Controls */}
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

        {/* Action Buttons */}
        {finalText && state === 'completed' && (
          <div style={{ display: 'flex', gap: tokens.space.md, marginTop: tokens.space.lg }}>
            <button
              onClick={handleSaveTranscript}
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
              Save to Files
            </button>
            <button
              onClick={handleCopyToClipboard}
              style={{
                backgroundColor: tokens.color.surface,
                color: tokens.color.text,
                padding: `${tokens.space.md}px ${tokens.space.xxl}px`,
                borderRadius: tokens.radius.md,
                border: 'none',
                fontSize: tokens.fontSize.md,
                fontWeight: tokens.fontWeight.medium,
              }}
            >
              Copy to Clipboard
            </button>
          </div>
        )}
      </div>

      {/* Pulse animation keyframes */}
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
