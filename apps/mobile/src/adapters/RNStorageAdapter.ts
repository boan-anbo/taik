/**
 * React Native Storage Adapter
 *
 * Bridges @taik/domain's IStorageAdapter to mobile storage:
 * - Uses SharedStorage (App Groups) for deck_buttons and engine_settings
 *   (needed for keyboard extension IPC)
 * - Uses AsyncStorage for other keys (transcripts, etc.)
 *
 * Note: Empty arrays for deck_buttons are treated as "no data" (returns null).
 * This aligns with domain store expectations where null means use defaults.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  IStorageAdapter,
  StorageChangeCallback,
  Unsubscribe,
} from '@taik/capabilities';
import SharedStorage, {
  addButtonsChangedListener,
} from '../../modules/shared-storage/src';
import { STORAGE_KEYS } from '@taik/domain';
import type { DeckButton, SpeechEngineSettings } from '@taik/domain';

/**
 * Keys that use SharedStorage (App Groups) for keyboard extension access
 */
const SHARED_STORAGE_KEYS = new Set([
  STORAGE_KEYS.deckButtons,
  STORAGE_KEYS.engineSettings,
]);

export class RNStorageAdapter implements IStorageAdapter {
  private listeners: Map<string, Set<StorageChangeCallback<unknown>>> = new Map();
  private sharedStorageSubscriptions: Map<string, { remove: () => void }> = new Map();
  private cachedValues: Map<string, unknown> = new Map();

  async get<T>(key: string): Promise<T | null> {
    try {
      // Use SharedStorage for keys that need keyboard extension access
      if (key === STORAGE_KEYS.deckButtons) {
        const buttons = await SharedStorage.getButtons();
        return (buttons.length > 0 ? buttons : null) as T | null;
      }

      if (key === STORAGE_KEYS.engineSettings) {
        return SharedStorage.getEngineSettings() as Promise<T | null>;
      }
    } catch (error) {
      console.warn(`RNStorageAdapter: SharedStorage.get failed for ${key}:`, error);
      return null;
    }

    // Use AsyncStorage for other keys
    try {
      const value = await AsyncStorage.getItem(key);
      if (!value) return null;
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    const oldValue = await this.get<T>(key);

    try {
      // Use SharedStorage for keys that need keyboard extension access
      if (key === STORAGE_KEYS.deckButtons) {
        await SharedStorage.setButtons(value as unknown as DeckButton[]);
        this.notifyListeners(key, value, oldValue);
        return;
      }

      if (key === STORAGE_KEYS.engineSettings) {
        await SharedStorage.setEngineSettings(value as unknown as SpeechEngineSettings);
        this.notifyListeners(key, value, oldValue);
        return;
      }
    } catch (error) {
      console.warn(`RNStorageAdapter: SharedStorage.set failed for ${key}:`, error);
      throw error;
    }

    // Use AsyncStorage for other keys
    await AsyncStorage.setItem(key, JSON.stringify(value));
    this.notifyListeners(key, value, oldValue);
  }

  async delete(key: string): Promise<void> {
    const oldValue = await this.get(key);

    try {
      if (key === STORAGE_KEYS.deckButtons) {
        await SharedStorage.setButtons([]);
        this.notifyListeners(key, null, oldValue);
        return;
      }

      if (key === STORAGE_KEYS.engineSettings) {
        // Can't really delete settings, set to null/defaults
        this.notifyListeners(key, null, oldValue);
        return;
      }
    } catch (error) {
      console.warn(`RNStorageAdapter: SharedStorage.delete failed for ${key}:`, error);
      throw error;
    }

    await AsyncStorage.removeItem(key);
    this.notifyListeners(key, null, oldValue);
  }

  async has(key: string): Promise<boolean> {
    try {
      if (key === STORAGE_KEYS.deckButtons) {
        const buttons = await SharedStorage.getButtons();
        return buttons.length > 0;
      }

      if (key === STORAGE_KEYS.engineSettings) {
        const settings = await SharedStorage.getEngineSettings();
        return settings !== null;
      }
    } catch (error) {
      console.warn(`RNStorageAdapter: SharedStorage.has failed for ${key}:`, error);
      return false;
    }

    const value = await AsyncStorage.getItem(key);
    return value !== null;
  }

  async keys(): Promise<string[]> {
    const asyncKeys = await AsyncStorage.getAllKeys();
    // Use Set to deduplicate (in case SharedStorage keys also exist in AsyncStorage)
    const allKeys = new Set([
      ...asyncKeys,
      STORAGE_KEYS.deckButtons,
      STORAGE_KEYS.engineSettings,
    ]);
    return Array.from(allKeys);
  }

  async clear(): Promise<void> {
    await AsyncStorage.clear();
    try {
      await SharedStorage.setButtons([]);
    } catch (error) {
      console.warn('RNStorageAdapter: Failed to clear SharedStorage buttons:', error);
    }
    // Note: Don't clear engine settings as that would remove API keys
  }

  subscribe<T>(key: string, callback: StorageChangeCallback<T>): Unsubscribe {
    // Register local listener
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key)!.add(callback as StorageChangeCallback<unknown>);

    // Set up SharedStorage listener for deck buttons
    if (key === STORAGE_KEYS.deckButtons && !this.sharedStorageSubscriptions.has(key)) {
      // Cache initial value for oldValue tracking
      SharedStorage.getButtons().then((buttons) => {
        this.cachedValues.set(key, buttons);
      }).catch(() => {});

      const subscription = addButtonsChangedListener((event) => {
        const listeners = this.listeners.get(key);
        if (listeners) {
          const oldValue = this.cachedValues.get(key) as DeckButton[] | null;
          for (const listener of listeners) {
            (listener as StorageChangeCallback<DeckButton[]>)(event.buttons, oldValue);
          }
          this.cachedValues.set(key, event.buttons);
        }
      });
      this.sharedStorageSubscriptions.set(key, subscription);
    }

    return () => {
      this.listeners.get(key)?.delete(callback as StorageChangeCallback<unknown>);

      // Clean up if no more listeners for this key
      if (this.listeners.get(key)?.size === 0) {
        // Remove SharedStorage subscription
        this.sharedStorageSubscriptions.get(key)?.remove();
        this.sharedStorageSubscriptions.delete(key);
        // Clean up cached value
        this.cachedValues.delete(key);
        // Remove empty Set from listeners Map (prevent memory leak)
        this.listeners.delete(key);
      }
    };
  }

  async getMultiple<T>(keys: string[]): Promise<Map<string, T | null>> {
    const result = new Map<string, T | null>();
    for (const key of keys) {
      result.set(key, await this.get<T>(key));
    }
    return result;
  }

  async setMultiple<T>(entries: Map<string, T>): Promise<void> {
    for (const [key, value] of entries) {
      await this.set(key, value);
    }
  }

  private notifyListeners<T>(key: string, newValue: T | null, oldValue: T | null): void {
    const callbacks = this.listeners.get(key);
    if (callbacks) {
      for (const callback of callbacks) {
        (callback as StorageChangeCallback<T>)(newValue, oldValue);
      }
    }
  }
}
