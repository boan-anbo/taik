/**
 * Voice Store
 * Zustand store for voice input settings and window state
 */

import { create } from 'zustand';
import { getStorageAdapter, addStorageChangeListener } from './adapter';
import type {
  VoiceSettings,
  VoiceDisplayMode,
  VoiceWidgetMode,
  VoiceOutputDestination,
  VoiceWindowPositions,
} from '../types/voice';
import { DEFAULT_VOICE_SETTINGS } from '../types/voice';
import { STORAGE_KEYS } from '../types/storage-keys';

interface VoiceState {
  /** Voice settings */
  settings: VoiceSettings;
  /** Window positions */
  windowPositions: VoiceWindowPositions;
  /** Voice window visibility */
  isVoiceWindowVisible: boolean;
  /** Loading state */
  isLoading: boolean;
  /** Error message */
  error: string | null;

  // Actions
  /** Load settings from storage */
  loadSettings: () => Promise<void>;
  /** Update settings */
  updateSettings: (partial: Partial<VoiceSettings>) => Promise<void>;
  /** Set display mode */
  setDisplayMode: (mode: VoiceDisplayMode) => Promise<void>;
  /** Set widget mode */
  setWidgetMode: (mode: VoiceWidgetMode) => Promise<void>;
  /** Set output destination */
  setOutputDestination: (dest: VoiceOutputDestination) => Promise<void>;
  /** Toggle auto-hide */
  setAutoHide: (enabled: boolean) => Promise<void>;
  /** Set voice toggle hotkey */
  setVoiceToggleHotkey: (hotkey: string) => Promise<void>;
  /** Set voice window visibility (local state only) */
  setVoiceWindowVisible: (visible: boolean) => void;
  /** Save window position */
  saveWindowPosition: (
    windowType: 'voice' | 'combined',
    position: { x: number; y: number; width: number; height: number }
  ) => Promise<void>;
  /** Clear error */
  clearError: () => void;
}

export const useVoiceStore = create<VoiceState>((set, get) => ({
  settings: DEFAULT_VOICE_SETTINGS,
  windowPositions: {},
  isVoiceWindowVisible: false,
  isLoading: false,
  error: null,

  loadSettings: async () => {
    set({ isLoading: true, error: null });
    try {
      const storage = getStorageAdapter();

      // Load settings
      const settings = await storage.get<VoiceSettings>(STORAGE_KEYS.voiceSettings);
      if (settings) {
        set({ settings: { ...DEFAULT_VOICE_SETTINGS, ...settings } });
      }

      // Load window positions
      const positions = await storage.get<VoiceWindowPositions>(
        STORAGE_KEYS.voiceWindowPositions
      );
      if (positions) {
        set({ windowPositions: positions });
      }

      set({ isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to load voice settings',
        isLoading: false,
      });
    }
  },

  updateSettings: async (partial) => {
    const { settings } = get();
    const updated: VoiceSettings = { ...settings, ...partial };

    try {
      const storage = getStorageAdapter();
      await storage.set(STORAGE_KEYS.voiceSettings, updated);
      set({ settings: updated });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to save voice settings',
      });
    }
  },

  setDisplayMode: async (mode) => {
    await get().updateSettings({ displayMode: mode });
  },

  setWidgetMode: async (mode) => {
    await get().updateSettings({ widgetMode: mode });
  },

  setOutputDestination: async (dest) => {
    await get().updateSettings({ outputDestination: dest });
  },

  setAutoHide: async (enabled) => {
    await get().updateSettings({ autoHideAfterRecording: enabled });
  },

  setVoiceToggleHotkey: async (hotkey) => {
    await get().updateSettings({ voiceToggleHotkey: hotkey });
  },

  setVoiceWindowVisible: (visible) => {
    set({ isVoiceWindowVisible: visible });
  },

  saveWindowPosition: async (windowType, position) => {
    const { windowPositions } = get();
    const updated: VoiceWindowPositions = {
      ...windowPositions,
      [windowType]: position,
    };

    try {
      const storage = getStorageAdapter();
      await storage.set(STORAGE_KEYS.voiceWindowPositions, updated);
      set({ windowPositions: updated });
    } catch (err) {
      // Silent fail for position saving
      console.warn('Failed to save window position:', err);
    }
  },

  clearError: () => set({ error: null }),
}));

// Subscription management
let voiceSubscription: (() => void) | null = null;

/**
 * Set up voice store sync with storage
 */
export function setupVoiceStoreSync(): void {
  if (voiceSubscription) return;

  voiceSubscription = addStorageChangeListener(STORAGE_KEYS.voiceSettings, () => {
    // Reload settings when storage changes externally
    useVoiceStore.getState().loadSettings();
  });

  // Initial load
  useVoiceStore.getState().loadSettings();
}

/**
 * Clean up voice store sync
 */
export function cleanupVoiceStoreSync(): void {
  voiceSubscription?.();
  voiceSubscription = null;
}
