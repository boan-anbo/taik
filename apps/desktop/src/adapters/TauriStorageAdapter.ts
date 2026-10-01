/**
 * Tauri Storage Adapter
 * Implements IStorageAdapter using Tauri's store plugin
 */

import { Store } from '@tauri-apps/plugin-store';
import { emit, listen } from '@tauri-apps/api/event';
import type {
  IStorageAdapter,
  StorageChangeCallback,
  Unsubscribe,
} from '@taik/capabilities';

/**
 * Storage adapter implementation for Tauri desktop app
 */
export class TauriStorageAdapter implements IStorageAdapter {
  private static readonly CHANGE_EVENT = 'taik:storage-change';
  private store: Store | null = null;
  private storeName: string;
  private listeners: Map<string, Set<StorageChangeCallback<unknown>>> = new Map();
  private initialized: boolean = false;
  private initPromise: Promise<void> | null = null;
  private readonly originId: string;
  private externalListenerReady = false;

  constructor(storeName: string = 'taik-store.json') {
    this.storeName = storeName;
    this.originId = Math.random().toString(36).slice(2);
    this.initPromise = this.initialize();
  }

  private async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // In Tauri v2, Store.load() is a static factory method
      this.store = await Store.load(this.storeName);
      this.initialized = true;
      this.ensureExternalListener();
    } catch (error) {
      console.error('Failed to initialize Tauri store:', error);
      throw error;
    }
  }

  private ensureExternalListener(): void {
    if (this.externalListenerReady) return;
    this.externalListenerReady = true;

    listen(TauriStorageAdapter.CHANGE_EVENT, (event) => {
      const payload = event.payload as
        | { key?: string; value?: unknown; origin?: string }
        | undefined;
      if (!payload?.key) return;
      if (payload.origin && payload.origin === this.originId) return;
      if (payload.key === '*') {
        for (const key of this.listeners.keys()) {
          this.notifyListeners(key, null, null);
        }
        return;
      }

      this.notifyListeners(payload.key, payload.value ?? null, null);
    }).catch((error) => {
      console.warn('Failed to listen for storage changes:', error);
    });
  }

  private async broadcastChange<T>(key: string, value: T | null): Promise<void> {
    try {
      await emit(TauriStorageAdapter.CHANGE_EVENT, {
        key,
        value,
        origin: this.originId,
      });
    } catch (error) {
      console.warn('Failed to broadcast storage change:', error);
    }
  }

  private async ensureInitialized(): Promise<Store> {
    if (!this.initialized && this.initPromise) {
      await this.initPromise;
    }
    if (!this.store) {
      throw new Error('Store not initialized');
    }
    return this.store;
  }

  private shouldReinitializeAfterError(error: unknown): boolean {
    if (error instanceof Error) {
      const msg = error.message.toLowerCase();
      return (
        msg.includes('plugin:store') ||
        msg.includes('invoke("plugin:store') ||
        msg.includes('rid') ||
        msg.includes('null is not an object')
      );
    }

    // Some plugin errors can surface as non-Error values (e.g. numeric codes).
    return true;
  }

  private async reinitialize(): Promise<void> {
    this.initialized = false;
    this.store = null;
    this.initPromise = this.initialize();
    await this.ensureInitialized();
  }

  private async withStore<T>(operation: (store: Store) => Promise<T>): Promise<T> {
    const store = await this.ensureInitialized();
    try {
      return await operation(store);
    } catch (error) {
      if (!this.shouldReinitializeAfterError(error)) {
        throw error;
      }
      await this.reinitialize();
      const store2 = await this.ensureInitialized();
      return await operation(store2);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.withStore((store) => store.get<T>(key));
      return value ?? null;
    } catch (error) {
      console.error(`Failed to get key "${key}":`, error);
      return null;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    try {
      const { oldValue } = await this.withStore(async (store) => {
        const oldValue = await store.get<T>(key);
        await store.set(key, value);
        await store.save();
        return { oldValue };
      });

      // Notify listeners
      this.notifyListeners(key, value, oldValue ?? null);
      await this.broadcastChange(key, value);
    } catch (error) {
      console.error(`Failed to set key "${key}":`, error);
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const { oldValue } = await this.withStore(async (store) => {
        const oldValue = await store.get(key);
        await store.delete(key);
        await store.save();
        return { oldValue };
      });

      // Notify listeners
      this.notifyListeners(key, null, oldValue);
      await this.broadcastChange(key, null);
    } catch (error) {
      console.error(`Failed to delete key "${key}":`, error);
      throw error;
    }
  }

  async has(key: string): Promise<boolean> {
    try {
      return await this.withStore((store) => store.has(key));
    } catch (error) {
      console.error(`Failed to check key "${key}":`, error);
      return false;
    }
  }

  async keys(): Promise<string[]> {
    try {
      return await this.withStore((store) => store.keys());
    } catch (error) {
      console.error('Failed to get keys:', error);
      return [];
    }
  }

  async clear(): Promise<void> {
    try {
      await this.withStore(async (store) => {
        await store.clear();
        await store.save();
      });

      // Notify all listeners with null values
      for (const [_key, callbacks] of this.listeners) {
        for (const callback of callbacks) {
          callback(null, null);
        }
      }
      await this.broadcastChange('*', null);
    } catch (error) {
      console.error('Failed to clear store:', error);
      throw error;
    }
  }

  subscribe<T>(key: string, callback: StorageChangeCallback<T>): Unsubscribe {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key)!.add(callback as StorageChangeCallback<unknown>);

    return () => {
      const callbacks = this.listeners.get(key);
      if (callbacks) {
        callbacks.delete(callback as StorageChangeCallback<unknown>);
        if (callbacks.size === 0) {
          this.listeners.delete(key);
        }
      }
    };
  }

  async getMultiple<T>(keys: string[]): Promise<Map<string, T | null>> {
    await this.ensureInitialized();
    const result = new Map<string, T | null>();

    for (const key of keys) {
      const value = await this.get<T>(key);
      result.set(key, value);
    }

    return result;
  }

  async setMultiple<T>(entries: Map<string, T>): Promise<void> {
    await this.withStore(async (store) => {
      for (const [key, value] of entries) {
        await store.set(key, value);
      }
      await store.save();
    });

    // Notify listeners for each key
    for (const [key, value] of entries) {
      this.notifyListeners(key, value, null);
      await this.broadcastChange(key, value);
    }
  }

  private notifyListeners<T>(key: string, newValue: T | null, oldValue: T | null): void {
    const callbacks = this.listeners.get(key);
    if (callbacks) {
      for (const callback of callbacks) {
        try {
          (callback as StorageChangeCallback<T>)(newValue, oldValue);
        } catch (error) {
          console.error(`Error in storage change callback for key "${key}":`, error);
        }
      }
    }
  }
}
