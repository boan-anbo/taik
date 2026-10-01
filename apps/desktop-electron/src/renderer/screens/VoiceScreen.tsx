/**
 * Voice Screen
 * Standalone screen for the floating voice window
 */

import { useEffect, useCallback, useRef } from 'react';
import { emit, listen, type UnlistenFn } from '../platform/events';
import { useVoiceStore, useSettingsStore } from '@taik/domain';
import { VoiceWidget, type VoiceWidgetRef } from '../components/VoiceWidget';
import { HOTKEY_EVENTS } from '../hooks/useGlobalHotkeys';
import { safeUnlisten } from '../utils/safeUnlisten';
import { systemAdapter } from '../platform/system';

import './VoiceScreen.css';

/**
 * Voice screen for floating window (route: /voice-panel)
 */
export function VoiceScreen() {
  const { settings, loadSettings } = useVoiceStore();
  const { loadSettings: loadEngineSettings } = useSettingsStore();
  const debug = (...args: unknown[]) => {
    if (import.meta.env.DEV) {
      console.log(...args);
    }
  };

  // Ref for imperative control of VoiceWidget
  const voiceWidgetRef = useRef<VoiceWidgetRef>(null);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
    loadEngineSettings();
  }, [loadSettings, loadEngineSettings]);

  // Signal readiness to the main window so the first global hotkey press can toggle recording.
  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 40; // ~2s at 50ms

    const interval = window.setInterval(() => {
      attempts += 1;
      if (voiceWidgetRef.current) {
        emit(HOTKEY_EVENTS.voicePanelReady);
        clearInterval(interval);
      } else if (attempts >= maxAttempts) {
        clearInterval(interval);
      }
    }, 50);

    return () => {
      clearInterval(interval);
    };
  }, []);

  // Listen for toggle-recording event from global hotkey
  useEffect(() => {
    let unlisten: UnlistenFn | undefined;

    const setup = async () => {
      debug('[VoiceScreen] Setting up event listener for voice:toggle-recording');
      unlisten = await listen(HOTKEY_EVENTS.voiceToggleRecording, async () => {
        debug('[VoiceScreen] Received toggle-recording event');

        if (voiceWidgetRef.current) {
          if (voiceWidgetRef.current.isRecording) {
            // Currently recording -> stop
            await voiceWidgetRef.current.stopRecording();
          } else {
            // Not recording -> start
            await voiceWidgetRef.current.startRecording();
          }
        } else {
          debug('[VoiceScreen] voiceWidgetRef is null!');
        }
      });
      debug('[VoiceScreen] Event listener registered');
    };

    setup();

    return () => {
      debug('[VoiceScreen] Cleaning up event listener');
      safeUnlisten(unlisten);
    };
  }, []);

  // Hide window
  const hideWindow = useCallback(async () => {
    await systemAdapter.hideWindow('floating-voice');
  }, []);

  return (
    <div className="voice-screen">
      {/* Drag handle / Header */}
      <div
        className="voice-header"
      >
        <span className="voice-title">Voice</span>
        <button
          className="voice-close-btn"
          onClick={hideWindow}
          title="Hide (Cmd+Shift+V)"
        >
          ×
        </button>
      </div>

      {/* Voice Widget Content */}
      <div className="voice-content">
        <VoiceWidget ref={voiceWidgetRef} mode={settings.widgetMode} standalone />
      </div>
    </div>
  );
}
