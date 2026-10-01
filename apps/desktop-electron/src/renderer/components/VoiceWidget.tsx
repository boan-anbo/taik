/**
 * Voice Widget
 * Adaptive voice input widget with multiple UI complexity levels
 * Supports both realtime and async recording modes with waveform visualization
 */

import { useCallback, useMemo, useEffect, useState, useRef, forwardRef, useImperativeHandle } from 'react';
import {
  useRecordingSession,
  useVoiceStore,
  useSettingsStore,
  getSonioxApiKey,
  type VoiceWidgetMode,
  type VoiceRecordingResult,
} from '@taik/domain';
import { TranscriptDisplay, WaveformDisplay } from '@taik/ui-dom';
import { BrowserMediaDeviceAdapter } from '@taik/platform-web';
import { ElectronTextInputAdapter } from '../adapters/ElectronTextInputAdapter';
import { ElectronAudioAdapter } from '../adapters/ElectronAudioAdapter';
import { AudioDeviceSelector } from './AudioDeviceSelector';
import { systemAdapter } from '../platform/system';

import './VoiceWidget.css';

const capabilitiesTextInputAdapter = new ElectronTextInputAdapter();
const voiceTextInputAdapter = {
  insertText: async (text: string): Promise<boolean> => {
    const result = await capabilitiesTextInputAdapter.insertText({ text, method: 'clipboard' });
    return result.success;
  },
};
const audioAdapter = new ElectronAudioAdapter();

/** Feedback message after recording completes */
interface FeedbackMessage {
  type: 'success' | 'warning' | 'error';
  text: string;
}

interface VoiceWidgetProps {
  /** Override widget mode (defaults to settings) */
  mode?: VoiceWidgetMode;
  /** Whether this is in a standalone window */
  standalone?: boolean;
  /** Custom class name */
  className?: string;
}

/**
 * Ref handle for imperative control of VoiceWidget
 */
export interface VoiceWidgetRef {
  /** Start recording */
  startRecording: () => Promise<void>;
  /** Stop recording */
  stopRecording: () => Promise<void>;
  /** Whether currently recording */
  isRecording: boolean;
}

/**
 * Format duration in seconds to mm:ss
 */
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Voice input widget with adaptive UI
 */
export const VoiceWidget = forwardRef<VoiceWidgetRef, VoiceWidgetProps>(
  function VoiceWidget({ mode: modeProp, standalone, className }, ref) {
  const { settings } = useVoiceStore();
  const { engineSettings } = useSettingsStore();
  const [feedback, setFeedback] = useState<FeedbackMessage | null>(null);
  const [displayDuration, setDisplayDuration] = useState(0);
  const durationRef = useRef<number | null>(null);
  const [pendingActivationAction, setPendingActivationAction] = useState<'record' | 'monitor' | null>(null);
  const deviceAdapter = useMemo(() => new BrowserMediaDeviceAdapter(), []);

  // Use prop mode or settings mode
  const mode = modeProp ?? settings.widgetMode;
  const sonioxApiKey = getSonioxApiKey(engineSettings);
  const isAsyncMode = settings.recordingMode === 'async';

  // Create voice system adapter that can hide the window
  const voiceSystemAdapter = useMemo(
    () => ({
      copyToClipboard: async (text: string) => {
        await systemAdapter.copyToClipboard(text);
      },
      hideVoiceWindow: async () => {
        if (standalone) {
          await systemAdapter.hideWindow('floating-voice');
        }
      },
      showVoiceWindow: async () => {
        if (standalone) {
          if (typeof systemAdapter.showWindowInactive === 'function') {
            await systemAdapter.showWindowInactive('floating-voice');
          } else {
            await systemAdapter.showWindow('floating-voice');
          }
        }
      },
    }),
    [standalone]
  );

  // Generate feedback message from result
  const generateFeedback = useCallback((result: VoiceRecordingResult): FeedbackMessage => {
    if (!result.text) {
      return { type: 'warning', text: 'No speech detected' };
    }

    const actions: string[] = [];
    if (result.wasInserted) actions.push('inserted');
    if (result.wasCopied) actions.push('copied');
    if (result.wasSaved) actions.push('saved');

    if (actions.length === 0) {
      return { type: 'warning', text: 'Recording completed (no actions)' };
    }

    // Check for partial failures
    const { outputDestination } = settings;
    const shouldHaveInserted = outputDestination === 'insert' || outputDestination === 'both';
    const shouldHaveCopied = outputDestination === 'clipboard' || outputDestination === 'both';

    if (shouldHaveInserted && !result.wasInserted) {
      return { type: 'warning', text: 'Text copied (insert failed)' };
    }
    if (shouldHaveCopied && !result.wasCopied) {
      return { type: 'warning', text: 'Text inserted (copy failed)' };
    }

    return { type: 'success', text: `Done: ${actions.join(', ')}` };
  }, [settings]);

  const {
    state,
    mode: recordingMode,
    isRecording,
    isProcessing,
    progress,
    finalText,
    partialText,
    displayState,
    visualization,
    error,
    audioDevices,
    selectedAudioDeviceId,
    hasAudioPermission,
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
  } = useRecordingSession({
    apiKey: sonioxApiKey,
    languageHints: engineSettings.languageHints,
    finalizeTimeoutMs: engineSettings.soniox?.finalizeTimeoutMs,
    finalizeMinWaitMs: engineSettings.soniox?.finalizeMinWaitMs,
    audioAdapter,
    deviceAdapter,
    textInputAdapter: voiceTextInputAdapter,
    systemAdapter: voiceSystemAdapter,
    onCompleted: (result) => {
      console.log('[VoiceWidget] Recording completed:', result);
      const msg = generateFeedback(result);
      setFeedback(msg);
      // Clear feedback after delay
      setTimeout(() => setFeedback(null), 2000);
    },
    onError: (err) => {
      console.error('[VoiceWidget] Recording error:', err);
      setFeedback({ type: 'error', text: err.message || 'Recording failed' });
      setTimeout(() => setFeedback(null), 3000);
    },
  });

  // Update duration display with smooth updates
  useEffect(() => {
    if (isRecording) {
      durationRef.current = window.setInterval(() => {
        setDisplayDuration((prev) => prev + 0.1);
      }, 100);
      setDisplayDuration(0);
    } else {
      if (durationRef.current) {
        clearInterval(durationRef.current);
        durationRef.current = null;
      }
    }
    return () => {
      if (durationRef.current) {
        clearInterval(durationRef.current);
      }
    };
  }, [isRecording]);

  // Handle mic button click
  const handleMicClick = useCallback(async () => {
    if (isRecording) {
      await stopRecording();
    } else if (state === 'idle' || state === 'completed' || state === 'error') {
      if (state === 'completed' || state === 'error') {
        reset();
      }
      setFeedback(null); // Clear any previous feedback
      setPendingActivationAction('record');
      await startRecording();
    }
  }, [state, isRecording, startRecording, stopRecording, reset]);

  // Expose imperative methods to parent via ref
  useImperativeHandle(ref, () => ({
    startRecording: async () => {
      if (state === 'idle' || state === 'completed' || state === 'error') {
        if (state === 'completed' || state === 'error') {
          reset();
        }
        setFeedback(null);
        setPendingActivationAction('record');
        await startRecording();
      }
    },
    stopRecording: async () => {
      if (isRecording) {
        await stopRecording();
      }
    },
    isRecording,
  }), [state, isRecording, startRecording, stopRecording, reset]);

  // Handle keyboard shortcuts (Enter/Space to stop when recording)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle when recording
      if (!isRecording) return;

      // Enter or Space stops recording
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        stopRecording();
      }

      // Escape cancels (reset without saving)
      if (e.key === 'Escape') {
        e.preventDefault();
        cancelRecording();
        setFeedback({ type: 'warning', text: 'Recording cancelled' });
        setTimeout(() => setFeedback(null), 1500);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRecording, stopRecording, cancelRecording]);

  // Get button styles based on state
  const getMicButtonClass = (): string => {
    const classes = ['voice-mic-btn'];
    if (isRecording) classes.push('recording');
    if (state === 'starting' || state === 'stopping' || isProcessing) classes.push('processing');
    return classes.join(' ');
  };

  // Get status text
  const getStatusText = (): string => {
    switch (state) {
      case 'starting':
        return 'Starting...';
      case 'recording':
        if (isAsyncMode) {
          return `Recording... ${formatDuration(displayDuration)}`;
        }
        return 'Listening...';
      case 'stopping':
        return 'Finalizing...';
      case 'processing':
        return `Processing... ${progress}%`;
      case 'completed':
        return finalText ? 'Done!' : 'No speech detected';
      case 'error':
        return error || 'Error';
      default:
        return 'Tap to speak';
    }
  };

  const hasApiKey = sonioxApiKey.trim() !== '';
  const isDisabled = !hasApiKey || state === 'starting' || state === 'stopping' || isProcessing;

  // Get ARIA description for accessibility
  const getAriaDescription = (): string => {
    if (!hasApiKey) return 'API key required. Configure in Settings.';
    if (isRecording) return 'Recording in progress. Press Enter, Space, or click to stop. Press Escape to cancel.';
    if (state === 'starting') return 'Starting recording...';
    if (state === 'stopping') return 'Finalizing transcription...';
    if (isProcessing) return `Processing transcription: ${progress}%`;
    return 'Click to start voice recording';
  };

  // Show waveform in recording state (for async mode or any mode with visualization)
  const showWaveform = isRecording || isMonitoring;
  const showAudioControls = mode !== 'minimal' || Boolean(standalone);
  const isAudioControlDisabled = state === 'starting' || state === 'stopping' || isRecording || isProcessing;
  const showStatusText = mode === 'status' || mode === 'preview' || mode === 'full' || Boolean(standalone);

  const handleToggleMonitoring = useCallback(async () => {
    if (isMonitoring) {
      stopMonitoring();
      return;
    }

    // Ensure permission first for better UX (so device labels + stable stream)
    if (!hasAudioPermission) {
      const granted = await requestAudioPermission();
      if (!granted) return;
    }

    setPendingActivationAction('monitor');
    await startMonitoring();
  }, [hasAudioPermission, isMonitoring, requestAudioPermission, startMonitoring, stopMonitoring]);

  // Clear pending action once audio is active or activation is no longer required.
  useEffect(() => {
    if (isRecording || isMonitoring || !requiresUserActivation) {
      setPendingActivationAction(null);
    }
  }, [isMonitoring, isRecording, requiresUserActivation]);

  const handleActivateAndRetry = useCallback(async () => {
    clearUserActivationRequirement();
    setFeedback(null);
    const action = pendingActivationAction ?? 'record';
    if (action === 'monitor') {
      setPendingActivationAction('monitor');
      await startMonitoring();
      return;
    }
    setPendingActivationAction('record');
    await startRecording();
  }, [
    clearUserActivationRequirement,
    pendingActivationAction,
    startMonitoring,
    startRecording,
  ]);

  // Allow "press any key" to unlock audio as well (useful when the panel is shown via global hotkey).
  useEffect(() => {
    if (!requiresUserActivation) return;
    const onKeyDown = () => {
      void handleActivateAndRetry();
    };
    window.addEventListener('keydown', onKeyDown, { once: true });
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleActivateAndRetry, requiresUserActivation]);

  // Render based on mode
  return (
    <div
      className={`voice-widget mode-${mode} ${className || ''}`}
      role="region"
      aria-label="Voice input"
    >
      {requiresUserActivation && (
        <div
          className="voice-activation-overlay"
          role="alert"
          onClick={() => void handleActivateAndRetry()}
        >
          <div className="voice-activation-card" onClick={(e) => e.stopPropagation()}>
            <div className="voice-activation-title">需要激活音频</div>
            <div className="voice-activation-subtitle">
              第一次打开时系统可能会阻止音频处理。点击窗口（或按任意键）以启用麦克风，然后会自动继续。
            </div>
            <button
              type="button"
              className="voice-activation-btn"
              onClick={() => void handleActivateAndRetry()}
            >
              启用音频
            </button>
          </div>
        </div>
      )}

      {/* Mic Button - Always shown */}
      <button
        className={getMicButtonClass()}
        onClick={handleMicClick}
        disabled={isDisabled}
        aria-label={isRecording ? 'Stop recording' : 'Start voice recording'}
        aria-describedby="voice-description"
        aria-pressed={isRecording}
      >
        {isRecording ? (
          <StopIcon />
        ) : isProcessing ? (
          <ProcessingIcon />
        ) : (
          <MicIcon />
        )}
      </button>
      <span id="voice-description" className="visually-hidden">
        {getAriaDescription()}
      </span>

      {/* Audio input selector + monitoring */}
      {showAudioControls && (
        <div className="voice-audio-controls">
          <AudioDeviceSelector
            devices={audioDevices}
            selectedDeviceId={selectedAudioDeviceId}
            onSelect={(deviceId) => void selectAudioDevice(deviceId)}
            hasPermission={hasAudioPermission}
            onRequestPermission={() => void requestAudioPermission()}
            disabled={isAudioControlDisabled}
            compact
          />
          <button
            type="button"
            className={`voice-monitor-btn ${isMonitoring ? 'active' : ''}`}
            onClick={handleToggleMonitoring}
            disabled={isAudioControlDisabled}
            title={isMonitoring ? 'Stop input monitoring' : 'Test input (show waveform)'}
          >
            {isMonitoring ? 'Stop' : 'Test'}
          </button>
          <span
            className={`voice-signal-dot ${hasAudioSignal ? 'on' : 'off'}`}
            title={hasAudioSignal ? 'Input detected' : 'No input detected'}
          />
        </div>
      )}

      {/* Waveform visualization - shown when recording */}
      {showWaveform && (
        <div className="voice-waveform">
          <WaveformDisplay
            levels={visualization.waveform}
            volume={visualization.volume}
            isActive={isRecording || isMonitoring}
            height={32}
            barWidth={3}
            barGap={2}
          />
        </div>
      )}

      {/* Status text - shown in status/preview/full modes */}
      {showStatusText && (
        <div className="voice-status" aria-live="polite">
          {!hasApiKey ? 'Configure API key' : getStatusText()}
        </div>
      )}

      {/* Recording mode indicator */}
      {(mode === 'preview' || mode === 'full') && !isRecording && !isProcessing && (
        <div className="voice-mode-indicator">
          {recordingMode === 'realtime' ? 'Realtime' : 'Async'} mode
        </div>
      )}

      {/* Transcript preview - shown in preview mode (realtime mode only shows partial) */}
      {mode === 'preview' && !isAsyncMode && (isRecording || finalText) && (
        <div className="voice-preview" aria-live="polite">
          {partialText || finalText || ''}
        </div>
      )}

      {/* Processing progress bar - shown during async processing */}
      {isProcessing && (
        <div className="voice-progress">
          <div className="voice-progress-bar" style={{ width: `${progress}%` }} />
        </div>
      )}

      {/* Full transcript - shown in full mode */}
      {mode === 'full' && (
        <div className="voice-transcript" aria-live="polite">
          <TranscriptDisplay
            displayState={displayState}
            showConfidence={false}
            emptyMessage={hasApiKey ? '' : 'Configure API key in Settings'}
          />
        </div>
      )}

      {/* Feedback toast - shown after recording completes */}
      {feedback && (
        <div
          className={`voice-feedback voice-feedback-${feedback.type}`}
          role="status"
          aria-live="assertive"
        >
          {feedback.type === 'success' && <span className="feedback-icon">✓</span>}
          {feedback.type === 'warning' && <span className="feedback-icon">!</span>}
          {feedback.type === 'error' && <span className="feedback-icon">✕</span>}
          <span className="feedback-text">{feedback.text}</span>
        </div>
      )}

      {/* Error display */}
      {error && (mode !== 'minimal' || standalone) && !feedback && (
        <div className="voice-error" role="alert">{error}</div>
      )}
    </div>
  );
});

/**
 * Microphone icon
 */
function MicIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
      <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
    </svg>
  );
}

/**
 * Stop icon (square)
 */
function StopIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}

/**
 * Processing icon (spinner-like)
 */
function ProcessingIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="voice-processing-icon">
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.3" />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
