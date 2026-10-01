/**
 * Voice Screen
 * Standalone screen for the floating voice window
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { getCurrentWindow, LogicalSize } from '@tauri-apps/api/window';
import { emit, listen, type UnlistenFn } from '@tauri-apps/api/event';
import { useVoiceStore, useSettingsStore } from '@taik/domain';
import { VoiceWidget, type VoiceWidgetRef } from '../components/VoiceWidget';
import { HOTKEY_EVENTS } from '../hooks/useGlobalHotkeys';
import { safeUnlisten } from '../utils/safeUnlisten';

import './VoiceScreen.css';

/**
 * Voice screen for floating window (route: /voice-panel)
 */
export function VoiceScreen() {
  const { settings, loadSettings } = useVoiceStore();
  const { loadSettings: loadEngineSettings } = useSettingsStore();
  const [isDragging, setIsDragging] = useState(false);
  const [systemPrefersDark, setSystemPrefersDark] = useState(false);
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

  // Track system theme when using "system" appearance
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => setSystemPrefersDark(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

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

  // Handle window drag
  const startDrag = useCallback(async (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('button, input, select, textarea, [data-no-drag]')) {
      return;
    }
    e.preventDefault();
    setIsDragging(true);
    const window = getCurrentWindow();
    await window.startDragging();
    setIsDragging(false);
  }, []);

  // Middle click toggles recording (useful when panel is always-on-top).
  const handleMiddleClick = useCallback((e: React.MouseEvent) => {
    if (e.button !== 1) return;
    e.preventDefault();
    e.stopPropagation();
    const widget = voiceWidgetRef.current;
    if (!widget) return;
    if (widget.isRecording) {
      void widget.stopRecording();
    } else {
      void widget.startRecording();
    }
  }, []);

  // Hide window
  const hideWindow = useCallback(async () => {
    const window = getCurrentWindow();
    await window.hide();
  }, []);

  const isStripLayout = settings.panelLayout === 'strip';

  const effectiveMode = isStripLayout ? 'minimal' : 'preview';

  const effectiveTheme =
    settings.theme === 'system'
      ? systemPrefersDark
        ? 'dark'
        : 'light'
      : settings.theme;

  useEffect(() => {
    const applyLayout = async () => {
      try {
        const window = getCurrentWindow();
        const size = isStripLayout
          ? new LogicalSize(360, 56)
          : new LogicalSize(336, 108);
        await window.setSize(size);
      } catch (error) {
        debug('[VoiceScreen] Failed to apply window layout', error);
      }
    };
    applyLayout();
  }, [debug, isStripLayout]);

  return (
    <div className={`voice-screen theme-${effectiveTheme} layout-${settings.panelLayout}`}>
      <div
        className={`voice-shell ${isDragging ? 'dragging' : ''}`}
        onMouseDown={startDrag}
        onAuxClick={handleMiddleClick}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        <button
          className="voice-close-btn"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={hideWindow}
          title="Hide (Cmd+Shift+V)"
        >
          ×
        </button>
        <div className="voice-content">
          <VoiceWidget
            ref={voiceWidgetRef}
            mode={effectiveMode}
            layout={settings.panelLayout}
            standalone
            className="voice-widget-floating"
          />
        </div>
      </div>
    </div>
  );
}
