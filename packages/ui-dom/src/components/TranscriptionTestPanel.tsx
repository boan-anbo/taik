/**
 * Transcription Test Panel Component
 * Displays transcription results for testing real-time vs async modes
 */

import { useEffect, useCallback, useRef } from 'react';
import { tokens } from '@taik/ui-tokens';
import {
  useRealtimeTranscription,
  useAsyncTranscription,
  type RealtimeTranscriptionState,
  type AsyncTranscriptionState,
} from '@taik/domain';
import { TranscriptDisplay } from './TranscriptDisplay';
import type { TranscriptionTestPanelProps } from '../types';

/**
 * Get status text for display
 */
function getStatusText(
  mode: 'realtime' | 'async',
  realtimeState: RealtimeTranscriptionState,
  asyncState: AsyncTranscriptionState,
  progress: number
): string {
  if (mode === 'realtime') {
    switch (realtimeState) {
      case 'idle':
        return 'Ready';
      case 'transcribing':
        return 'Transcribing (streaming)...';
      case 'completed':
        return 'Completed';
      case 'error':
        return 'Error';
      default:
        return '';
    }
  } else {
    switch (asyncState) {
      case 'idle':
        return 'Ready';
      case 'uploading':
        return `Uploading... ${progress}%`;
      case 'processing':
        return `Processing... ${progress}%`;
      case 'completed':
        return 'Completed';
      case 'error':
        return 'Error';
      default:
        return '';
    }
  }
}

/**
 * Transcription Test Panel
 * Can operate in either real-time (WebSocket streaming) or async (REST API) mode
 */
export function TranscriptionTestPanel({
  mode,
  audioData,
  fileName = 'audio.m4a',
  apiKey,
  languageHints = ['en'],
  autoStart = false,
  onComplete,
}: TranscriptionTestPanelProps) {
  // Real-time transcription hook
  const realtime = useRealtimeTranscription({
    apiKey,
    languageHints,
  });

  // Async transcription hook
  const async_ = useAsyncTranscription({
    apiKey,
    languageHints,
  });

  // Current state based on mode
  const state = mode === 'realtime' ? realtime.state : async_.state;
  const error = mode === 'realtime' ? realtime.error : async_.error;
  const finalText = mode === 'realtime' ? realtime.finalText : async_.finalText;

  // Track if autoStart has been triggered to prevent re-triggering
  const autoStartTriggeredRef = useRef(false);

  // Handle completion callback
  useEffect(() => {
    if (state === 'completed' && finalText && onComplete) {
      onComplete(finalText);
    }
  }, [state, finalText, onComplete]);

  // Start transcription
  const handleStart = useCallback(() => {
    if (!audioData) return;

    if (mode === 'realtime') {
      realtime.transcribe(audioData, 'auto');
    } else {
      async_.transcribe(audioData, fileName);
    }
  }, [mode, audioData, fileName, realtime, async_]);

  // Reset
  const handleReset = useCallback(() => {
    if (mode === 'realtime') {
      realtime.reset();
    } else {
      async_.reset();
    }
  }, [mode, realtime, async_]);

  // Auto-start when audioData is provided and autoStart is true
  // Uses ref to prevent re-triggering on every render
  useEffect(() => {
    if (autoStart && audioData && state === 'idle' && !autoStartTriggeredRef.current) {
      autoStartTriggeredRef.current = true;
      if (mode === 'realtime') {
        realtime.transcribe(audioData, 'auto');
      } else {
        async_.transcribe(audioData, fileName);
      }
    }
  }, [autoStart, audioData, state, mode, fileName, realtime.transcribe, async_.transcribe]);

  // Reset the autoStart trigger when autoStart becomes false
  useEffect(() => {
    if (!autoStart) {
      autoStartTriggeredRef.current = false;
    }
  }, [autoStart]);

  const isLoading = mode === 'realtime'
    ? realtime.state === 'transcribing'
    : async_.state === 'uploading' || async_.state === 'processing';

  const canStart = state === 'idle' && audioData !== null;
  const canReset = state === 'completed' || state === 'error';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: tokens.color.surface,
        borderRadius: tokens.radius.md,
        overflow: 'hidden',
        border: `1px solid ${tokens.color.borderSubtle}`,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: `${tokens.space.md}px ${tokens.space.lg}px`,
          borderBottom: `1px solid ${tokens.color.borderSubtle}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <h3
            style={{
              margin: 0,
              fontSize: tokens.fontSize.md,
              fontWeight: tokens.fontWeight.semibold,
              color: tokens.color.text,
            }}
          >
            {mode === 'realtime' ? 'Real-time (Streaming)' : 'Async (Batch)'}
          </h3>
          <p
            style={{
              margin: 0,
              marginTop: 4,
              fontSize: tokens.fontSize.sm,
              color: tokens.color.textSubtle,
            }}
          >
            {mode === 'realtime'
              ? 'WebSocket streaming with partial results'
              : 'REST API with progress polling'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: tokens.space.sm }}>
          {canStart && (
            <button
              onClick={handleStart}
              disabled={isLoading}
              style={{
                padding: `${tokens.space.sm}px ${tokens.space.md}px`,
                backgroundColor: tokens.color.brand,
                color: 'white',
                border: 'none',
                borderRadius: tokens.radius.sm,
                fontSize: tokens.fontSize.sm,
                fontWeight: tokens.fontWeight.medium,
                cursor: 'pointer',
              }}
            >
              Start
            </button>
          )}
          {canReset && (
            <button
              onClick={handleReset}
              style={{
                padding: `${tokens.space.sm}px ${tokens.space.md}px`,
                backgroundColor: 'transparent',
                color: tokens.color.textSubtle,
                border: `1px solid ${tokens.color.borderSubtle}`,
                borderRadius: tokens.radius.sm,
                fontSize: tokens.fontSize.sm,
                fontWeight: tokens.fontWeight.medium,
                cursor: 'pointer',
              }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Status */}
      <div
        style={{
          padding: `${tokens.space.sm}px ${tokens.space.lg}px`,
          backgroundColor: tokens.color.background,
          display: 'flex',
          alignItems: 'center',
          gap: tokens.space.md,
        }}
      >
        <span
          style={{
            fontSize: tokens.fontSize.sm,
            color: error ? tokens.color.danger : tokens.color.textSubtle,
          }}
        >
          {error || getStatusText(mode, realtime.state, async_.state, async_.progress)}
        </span>

        {/* Progress bar for async mode */}
        {mode === 'async' && (async_.state === 'uploading' || async_.state === 'processing') && (
          <div
            style={{
              flex: 1,
              height: 4,
              backgroundColor: tokens.color.borderSubtle,
              borderRadius: 2,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                backgroundColor: tokens.color.brand,
                width: `${async_.progress}%`,
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        )}
      </div>

      {/* Content */}
      <div
        style={{
          flex: 1,
          padding: tokens.space.lg,
          overflow: 'auto',
        }}
      >
        {mode === 'realtime' ? (
          <TranscriptDisplay
            displayState={realtime.displayState}
            showConfidence={true}
            emptyMessage={
              !audioData
                ? 'Load audio to begin'
                : state === 'idle'
                  ? 'Click Start to transcribe'
                  : ''
            }
          />
        ) : (
          // Async mode shows plain text (no partial results)
          <div
            style={{
              fontSize: tokens.fontSize.lg,
              lineHeight: 1.6,
              color: tokens.color.text,
            }}
          >
            {async_.finalText || (
              <p
                style={{
                  color: tokens.color.textSubtle,
                  textAlign: 'center',
                  marginTop: 40,
                }}
              >
                {!audioData
                  ? 'Load audio to begin'
                  : state === 'idle'
                    ? 'Click Start to transcribe'
                    : state === 'uploading' || state === 'processing'
                      ? 'Processing...'
                      : ''}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
