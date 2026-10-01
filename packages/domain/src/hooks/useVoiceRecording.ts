/**
 * Voice Recording Hook
 * Enhanced recording hook with auto-insert, clipboard, and history support
 */

import { useCallback, useRef } from 'react';
import { useRecording, type UseRecordingOptions, type RecordingState } from './useRecording';
import { useVoiceStore } from '../stores/voiceStore';
import { useTranscriptStore } from '../stores/transcriptStore';
import type { TranscriptDisplayState } from '../types/transcript';
import type { VoiceRecordingResult, VoiceOutputDestination } from '../types/voice';

/**
 * Text input adapter interface (platform-specific)
 */
export interface IVoiceTextInputAdapter {
  /** Insert text into currently focused application */
  insertText(text: string): Promise<boolean>;
  /** Get name of currently focused application */
  getFocusedAppName?(): Promise<string | null>;
}

/**
 * System adapter interface for clipboard and window operations
 */
export interface IVoiceSystemAdapter {
  /** Copy text to clipboard */
  copyToClipboard(text: string): Promise<void>;
  /** Hide the voice window */
  hideVoiceWindow?(): Promise<void>;
  /** Show the voice window (optional, used when focus must be released temporarily) */
  showVoiceWindow?(): Promise<void>;
}

/**
 * Voice recording hook options
 */
export interface UseVoiceRecordingOptions {
  /** Soniox API key */
  apiKey: string;
  /** Language hints */
  languageHints?: string[];
  /** Text input adapter (for auto-insert) */
  textInputAdapter?: IVoiceTextInputAdapter;
  /** System adapter (for clipboard, window) */
  systemAdapter?: IVoiceSystemAdapter;
  /** Callback when recording completes with result */
  onCompleted?: (result: VoiceRecordingResult) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
}

/**
 * Voice recording hook return type
 */
export interface UseVoiceRecordingReturn {
  /** Current recording state */
  state: RecordingState;
  /** Final transcript text */
  finalText: string;
  /** Display state for UI */
  displayState: TranscriptDisplayState;
  /** Error message */
  error: string | null;
  /** Start recording */
  startRecording: () => Promise<void>;
  /** Stop recording (triggers auto-actions) */
  stopRecording: () => Promise<void>;
  /** Reset to idle state */
  reset: () => void;
  /** Manually insert current text */
  insertText: () => Promise<boolean>;
  /** Manually copy current text to clipboard */
  copyToClipboard: () => Promise<void>;
  /** Manually save to history */
  saveToHistory: () => Promise<string | null>;
}

/**
 * Enhanced recording hook with auto-actions
 */
export function useVoiceRecording(
  options: UseVoiceRecordingOptions
): UseVoiceRecordingReturn {
  const {
    apiKey,
    languageHints = ['en'],
    textInputAdapter,
    systemAdapter,
    onCompleted,
    onError,
  } = options;

  const { settings } = useVoiceStore();
  const { addEntry } = useTranscriptStore();

  // Track recording start time for duration calculation
  const recordingStartRef = useRef<number | null>(null);
  const targetAppNameRef = useRef<string | null>(null);

  // Base recording hook
  const recording = useRecording({
    apiKey,
    languageHints,
    onStart: async () => {
      recordingStartRef.current = Date.now();
      // Capture target app name before recording starts
      if (textInputAdapter?.getFocusedAppName) {
        try {
          targetAppNameRef.current = await textInputAdapter.getFocusedAppName();
        } catch {
          targetAppNameRef.current = null;
        }
      }
    },
    onError: (err) => {
      onError?.(err);
    },
  });

  /**
   * Insert text into focused app
   */
  const insertText = useCallback(async (): Promise<boolean> => {
    if (!recording.finalText || !textInputAdapter) {
      return false;
    }

    try {
      return await textInputAdapter.insertText(recording.finalText);
    } catch (err) {
      console.error('Failed to insert text:', err);
      return false;
    }
  }, [recording.finalText, textInputAdapter]);

  /**
   * Copy text to clipboard
   */
  const copyToClipboard = useCallback(async (): Promise<void> => {
    if (!recording.finalText || !systemAdapter) {
      return;
    }

    try {
      await systemAdapter.copyToClipboard(recording.finalText);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  }, [recording.finalText, systemAdapter]);

  /**
   * Save to transcript history
   */
  const saveToHistory = useCallback(async (): Promise<string | null> => {
    if (!recording.finalText) {
      return null;
    }

    const duration = recordingStartRef.current
      ? (Date.now() - recordingStartRef.current) / 1000
      : 0;

    try {
      const entry = await addEntry(recording.finalText, 'live', duration, {
        engine: 'soniox',
        language: languageHints[0],
      });
      return entry.id;
    } catch (err) {
      console.error('Failed to save to history:', err);
      return null;
    }
  }, [recording.finalText, addEntry, languageHints]);

  /**
   * Execute auto-actions based on settings
   */
  const executeAutoActions = useCallback(
    async (text: string): Promise<VoiceRecordingResult> => {
      const duration = recordingStartRef.current
        ? (Date.now() - recordingStartRef.current) / 1000
        : 0;

      const result: VoiceRecordingResult = {
        text,
        duration,
        wasInserted: false,
        wasCopied: false,
        wasSaved: false,
      };

      const { outputDestination, autoHideAfterRecording, autoHideDelayMs } = settings;

      // Execute based on output destination
      if (shouldInsert(outputDestination) && textInputAdapter) {
        try {
          result.wasInserted = await textInputAdapter.insertText(text);
        } catch (err) {
          console.error('Auto-insert failed:', err);
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

      // Always save to history
      try {
        const entry = await addEntry(text, 'live', duration, {
          engine: 'soniox',
          language: languageHints[0],
        });
        result.wasSaved = true;
        result.entryId = entry.id;
      } catch (err) {
        console.error('Failed to save to history:', err);
      }

      // Auto-hide window
      if (autoHideAfterRecording && systemAdapter?.hideVoiceWindow) {
        setTimeout(() => {
          systemAdapter.hideVoiceWindow?.();
        }, autoHideDelayMs);
      }

      return result;
    },
    [settings, textInputAdapter, systemAdapter, addEntry, languageHints]
  );

  /**
   * Stop recording and execute auto-actions
   */
  const stopRecording = useCallback(async () => {
    await recording.stopRecording();

    // Wait a tick for final text to be populated
    // The useRecording hook updates state after stop
    setTimeout(async () => {
      const text = recording.finalText;
      if (text) {
        const result = await executeAutoActions(text);
        onCompleted?.(result);
      }
    }, 100);
  }, [recording, executeAutoActions, onCompleted]);

  return {
    state: recording.state,
    finalText: recording.finalText,
    displayState: recording.displayState,
    error: recording.error,
    startRecording: recording.startRecording,
    stopRecording,
    reset: recording.reset,
    insertText,
    copyToClipboard,
    saveToHistory,
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
