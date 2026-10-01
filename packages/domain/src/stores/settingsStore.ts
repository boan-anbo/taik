/**
 * Settings Store
 * Zustand store for app settings including speech engine configuration
 */

import { create } from 'zustand';
import { getStorageAdapter, addStorageChangeListener } from './adapter';
import type {
  SpeechEngineId,
  SpeechEngineSettings,
  WhisperModelInfo,
  SonioxProviderConfig,
  SonioxMode,
} from '../types/settings';
import { DEFAULT_ENGINE_SETTINGS, DEFAULT_SONIOX_CONFIG, getSonioxApiKey } from '../types/settings';
import { STORAGE_KEYS } from '../types/storage-keys';

interface SettingsState {
  /** Speech engine settings */
  engineSettings: SpeechEngineSettings;
  /** Available engines (detected at runtime) */
  availableEngines: SpeechEngineId[];
  /** Loading state */
  isLoading: boolean;
  /** Error message */
  error: string | null;

  // Actions
  /** Load settings from storage */
  loadSettings: () => Promise<void>;
  /** Set preferred speech engine */
  setPreferredEngine: (engine: SpeechEngineId) => Promise<void>;
  /** Set Soniox API key (migrates to new config structure) */
  setSonioxApiKey: (apiKey: string) => Promise<void>;
  /** Update Soniox provider configuration */
  updateSonioxConfig: (config: Partial<SonioxProviderConfig>) => Promise<void>;
  /** Set Soniox transcription mode */
  setSonioxMode: (mode: SonioxMode) => Promise<void>;
  /** Update Whisper model info */
  updateWhisperModel: (modelInfo: WhisperModelInfo) => Promise<void>;
  /** Set language hints */
  setLanguageHints: (languages: string[]) => Promise<void>;
  /** Check engine availability */
  detectAvailableEngines: () => Promise<void>;
  /** Clear error */
  clearError: () => void;
  /** Get effective Soniox API key (handles migration) */
  getEffectiveSonioxApiKey: () => string;
}

function normalizeEngineSettings(settings: SpeechEngineSettings): SpeechEngineSettings {
  const sonioxFromSettings: Partial<SonioxProviderConfig> = settings.soniox ?? {};
  const resolvedApiKey = sonioxFromSettings.apiKey ?? settings.sonioxApiKey ?? '';
  const mergedSoniox: SonioxProviderConfig = {
    ...DEFAULT_SONIOX_CONFIG,
    ...sonioxFromSettings,
    apiKey: resolvedApiKey,
  };

  return {
    ...DEFAULT_ENGINE_SETTINGS,
    ...settings,
    sonioxApiKey: resolvedApiKey,
    soniox: mergedSoniox,
  };
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  engineSettings: DEFAULT_ENGINE_SETTINGS,
  availableEngines: ['soniox'], // Soniox is always available if API key is set
  isLoading: false,
  error: null,

  loadSettings: async () => {
    set({ isLoading: true, error: null });
    try {
      const storage = getStorageAdapter();
      const settings = await storage.get<SpeechEngineSettings>(
        STORAGE_KEYS.engineSettings
      );
      if (settings) {
        const normalized = normalizeEngineSettings(settings);
        const changed = JSON.stringify(normalized) !== JSON.stringify(settings);
        if (changed) {
          await storage.set(STORAGE_KEYS.engineSettings, normalized);
        }
        set({ engineSettings: normalized, isLoading: false });
      } else {
        // Initialize with defaults
        await storage.set(STORAGE_KEYS.engineSettings, DEFAULT_ENGINE_SETTINGS);
        set({ engineSettings: DEFAULT_ENGINE_SETTINGS, isLoading: false });
      }
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to load settings',
        isLoading: false,
      });
    }
  },

  setPreferredEngine: async (engine) => {
    const { engineSettings } = get();
    const updated: SpeechEngineSettings = {
      ...engineSettings,
      preferredEngine: engine,
    };

    try {
      const storage = getStorageAdapter();
      await storage.set(STORAGE_KEYS.engineSettings, updated);
      set({ engineSettings: updated });
    } catch (err) {
      set({
        error:
          err instanceof Error ? err.message : 'Failed to save engine preference',
      });
    }
  },

  setSonioxApiKey: async (apiKey) => {
    const { engineSettings } = get();
    // Migrate to new structure: store in both places for backwards compatibility
    const currentSoniox = {
      ...DEFAULT_SONIOX_CONFIG,
      ...(engineSettings.soniox ?? {}),
    };
    const updated: SpeechEngineSettings = {
      ...engineSettings,
      sonioxApiKey: apiKey, // Keep for backwards compatibility
      soniox: {
        ...currentSoniox,
        apiKey,
      },
    };

    try {
      const storage = getStorageAdapter();
      await storage.set(STORAGE_KEYS.engineSettings, updated);
      set({ engineSettings: updated });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to save API key',
      });
    }
  },

  updateSonioxConfig: async (config) => {
    const { engineSettings } = get();
    const currentSoniox = engineSettings.soniox ?? DEFAULT_SONIOX_CONFIG;
    const updatedSoniox: SonioxProviderConfig = {
      ...currentSoniox,
      ...config,
    };

    const updated: SpeechEngineSettings = {
      ...engineSettings,
      soniox: updatedSoniox,
      // Keep sonioxApiKey in sync for backwards compatibility
      sonioxApiKey: updatedSoniox.apiKey,
    };

    try {
      const storage = getStorageAdapter();
      await storage.set(STORAGE_KEYS.engineSettings, updated);
      set({ engineSettings: updated });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to save Soniox config',
      });
    }
  },

  setSonioxMode: async (mode) => {
    const { updateSonioxConfig } = get();
    await updateSonioxConfig({ mode });
  },

  getEffectiveSonioxApiKey: () => {
    const { engineSettings } = get();
    return getSonioxApiKey(engineSettings);
  },

  updateWhisperModel: async (modelInfo) => {
    const { engineSettings } = get();
    const updated: SpeechEngineSettings = {
      ...engineSettings,
      whisperModel: modelInfo,
    };

    try {
      const storage = getStorageAdapter();
      await storage.set(STORAGE_KEYS.engineSettings, updated);
      set({ engineSettings: updated });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to save model info',
      });
    }
  },

  setLanguageHints: async (languages) => {
    const { engineSettings } = get();
    const updated: SpeechEngineSettings = {
      ...engineSettings,
      languageHints: languages,
    };

    try {
      const storage = getStorageAdapter();
      await storage.set(STORAGE_KEYS.engineSettings, updated);
      set({ engineSettings: updated });
    } catch (err) {
      set({
        error:
          err instanceof Error ? err.message : 'Failed to save language hints',
      });
    }
  },

  detectAvailableEngines: async () => {
    const available: SpeechEngineId[] = [];

    // Soniox is always available (requires API key)
    available.push('soniox');

    // Apple Speech is available on iOS/macOS
    // This will be determined by platform adapters
    // For now, we'll add it and let the platform check

    // Whisper is available if model is downloaded
    const { engineSettings } = get();
    if (engineSettings.whisperModel?.status === 'downloaded') {
      available.push('whisper');
    }

    set({ availableEngines: available });
  },

  clearError: () => set({ error: null }),
}));

// Subscription management
let settingsSubscription: (() => void) | null = null;

/**
 * Set up settings store sync with storage
 */
export function setupSettingsStoreSync(): void {
  if (settingsSubscription) return;

  settingsSubscription = addStorageChangeListener(
    STORAGE_KEYS.engineSettings,
    () => {
      // Reload settings when storage changes externally
      useSettingsStore.getState().loadSettings();
    }
  );

  // Initial load
  useSettingsStore.getState().loadSettings();
  useSettingsStore.getState().detectAvailableEngines();
}

/**
 * Clean up settings store sync
 */
export function cleanupSettingsStoreSync(): void {
  settingsSubscription?.();
  settingsSubscription = null;
}
