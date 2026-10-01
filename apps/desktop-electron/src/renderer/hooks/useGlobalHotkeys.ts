/**
 * Global Hotkeys Hook
 * Manages global keyboard shortcuts for the desktop app
 */

import { useEffect, useRef } from 'react';
import { emit, listen, type UnlistenFn } from '../platform/events';
import { useVoiceStore } from '@taik/domain';
import { ElectronSystemAdapter } from '../adapters/ElectronSystemAdapter';
import { safeUnlisten } from '../utils/safeUnlisten';

const systemAdapter = new ElectronSystemAdapter();

export interface HotkeyConfig {
  id: string;
  shortcut: string;
  handler: () => void;
  enabled?: boolean;
}

/**
 * Hook for registering and managing global hotkeys
 */
export function useGlobalHotkeys(hotkeys: HotkeyConfig[]) {
  const registeredRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const registerHotkeys = async () => {
      for (const config of hotkeys) {
        if (config.enabled === false) continue;

        try {
          // Unregister first if already registered
          if (registeredRef.current.has(config.id)) {
            await systemAdapter.unregisterHotkey(config.id);
          }

          await systemAdapter.registerHotkey(config.id, config.shortcut, config.handler);
          registeredRef.current.add(config.id);
        } catch (error) {
          console.error(`Failed to register hotkey ${config.id}:`, error);
        }
      }
    };

    registerHotkeys();

    // Cleanup on unmount
    return () => {
      const cleanup = async () => {
        for (const id of registeredRef.current) {
          try {
            await systemAdapter.unregisterHotkey(id);
          } catch {
            // Ignore cleanup errors
          }
        }
        registeredRef.current.clear();
      };
      void cleanup().catch(() => {
        // Ignore teardown errors (can happen during HMR / window teardown)
      });
    };
  }, [hotkeys]);
}

/**
 * Default hotkey shortcuts
 */
export const DEFAULT_HOTKEYS = {
  // Cmd+Shift+R is commonly used for reload in macOS apps; avoid collisions.
  toggleRecording: 'CommandOrControl+Shift+E',
  toggleFloatingDeck: 'CommandOrControl+Shift+D',
  toggleFloatingVoice: 'CommandOrControl+Shift+V',
} as const;

/**
 * Event names for hotkey actions
 */
export const HOTKEY_EVENTS = {
  toggleRecording: 'hotkey:toggle-recording',
  toggleFloatingDeck: 'hotkey:toggle-floating-deck',
  toggleFloatingVoice: 'hotkey:toggle-floating-voice',
  /** Event for voice toggle recording (show window + start/stop) */
  voiceToggleRecording: 'voice:toggle-recording',
  /** Emitted by the voice panel when it's ready to receive events */
  voicePanelReady: 'voice:panel-ready',
} as const;

/**
 * Hook to listen for hotkey events
 */
export function useHotkeyEvent(event: string, handler: () => void) {
  useEffect(() => {
    let unlisten: UnlistenFn | undefined;

    const setup = async () => {
      unlisten = await listen(event, () => {
        handler();
      });
    };

    setup();

    return () => {
      safeUnlisten(unlisten);
    };
  }, [event, handler]);
}

/**
 * Hook to set up app-wide global hotkeys (call once at app level)
 */
export function useAppGlobalHotkeys(options: { enabled?: boolean } = {}) {
  const { enabled = true } = options;
  const { settings } = useVoiceStore();
  const voicePanelReadyRef = useRef(false);
  const pendingVoiceToggleRef = useRef(false);

  // Get customizable hotkey with fallback to default
  const voiceToggleHotkey = settings.voiceToggleHotkey || DEFAULT_HOTKEYS.toggleFloatingVoice;

  useEffect(() => {
    if (!enabled) return;

    let unlistenReady: UnlistenFn | undefined;

    const setup = async () => {
      try {
        // Listen for voice panel readiness (so first hotkey press can start recording reliably)
        unlistenReady = await listen(HOTKEY_EVENTS.voicePanelReady, () => {
          voicePanelReadyRef.current = true;
          if (pendingVoiceToggleRef.current) {
            pendingVoiceToggleRef.current = false;
            emit(HOTKEY_EVENTS.voiceToggleRecording);
          }
        });

        // Register toggle recording hotkey
        await systemAdapter.registerHotkey(
          'toggle-recording',
          DEFAULT_HOTKEYS.toggleRecording,
          () => {
            emit(HOTKEY_EVENTS.toggleRecording);
          }
        );

        // Register toggle floating deck hotkey
        await systemAdapter.registerHotkey(
          'toggle-floating-deck',
          DEFAULT_HOTKEYS.toggleFloatingDeck,
          async () => {
            try {
              const isVisible = await systemAdapter.isWindowVisible('floating-deck');
              if (isVisible) {
                await systemAdapter.hideWindow('floating-deck');
              } else {
              if (typeof systemAdapter.showWindowInactive === 'function') {
                await systemAdapter.showWindowInactive('floating-deck');
              } else {
                await systemAdapter.showWindow('floating-deck');
              }
                await systemAdapter.focusWindow('floating-deck');
              }
            } catch (error) {
              console.error('Failed to toggle floating deck:', error);
            }
          }
        );

        // Register customizable voice toggle hotkey
        // Shows window if hidden, then emits event for VoiceScreen to start/stop recording
        const handleVoiceToggle = async () => {
          try {
            const isVisible = await systemAdapter.isWindowVisible('floating-voice');

            // Show window if hidden
            if (!isVisible) {
              // Keep focus on the current app so paste-based insertion targets it.
              await systemAdapter.showWindowInactive('floating-voice');
            }

            // Emit event for VoiceScreen to handle recording toggle.
            // If the panel isn't ready yet (first open), queue until it signals readiness.
            if (voicePanelReadyRef.current) {
              emit(HOTKEY_EVENTS.voiceToggleRecording);
            } else {
              pendingVoiceToggleRef.current = true;
            }
          } catch (error) {
            console.error('Failed to toggle floating voice:', error);
          }
        };

        try {
          await systemAdapter.registerHotkey('toggle-floating-voice', voiceToggleHotkey, handleVoiceToggle);
        } catch (error) {
          console.error(
            `Failed to register voice hotkey "${voiceToggleHotkey}", falling back to default "${DEFAULT_HOTKEYS.toggleFloatingVoice}":`,
            error
          );
          await systemAdapter.registerHotkey('toggle-floating-voice', DEFAULT_HOTKEYS.toggleFloatingVoice, handleVoiceToggle);
        }
      } catch (error) {
        console.error('Failed to register global hotkeys:', error);
      }
    };

    setup();

    return () => {
      const cleanup = async () => {
        try {
          await systemAdapter.unregisterAllHotkeys();
        } catch {
          // Ignore cleanup errors
        }
        try {
          safeUnlisten(unlistenReady);
        } catch {
          // Ignore teardown errors
        }
      };
      void cleanup().catch(() => {
        // Ignore teardown errors (can happen during HMR / window teardown)
      });
    };
  }, [enabled, voiceToggleHotkey]);
}
