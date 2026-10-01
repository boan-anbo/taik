import type { IStorageAdapter, StorageChangeCallback, Unsubscribe } from '@taik/capabilities';
import { getTaikApi } from '../platform/taik';

export class ElectronStorageAdapter implements IStorageAdapter {
  private unsub?: Unsubscribe;
  private listeners = new Map<string, Set<StorageChangeCallback<unknown>>>();

  constructor() {
    const api = getTaikApi();
    this.unsub = api.store.onChanged(({ key, newValue, oldValue }: { key: string; newValue: unknown; oldValue: unknown }) => {
      const cbs = this.listeners.get(key);
      if (!cbs) return;
      for (const cb of cbs) {
        try {
          cb(newValue as any, oldValue as any);
        } catch {
          // ignore
        }
      }
    });
  }

  async get<T>(key: string): Promise<T | null> {
    const api = getTaikApi();
    const v = await api.store.get(key);
    return (v ?? null) as T | null;
  }

  async set<T>(key: string, value: T): Promise<void> {
    const api = getTaikApi();
    await api.store.set(key, value);
  }

  async delete(key: string): Promise<void> {
    const api = getTaikApi();
    await api.store.delete(key);
  }

  async has(key: string): Promise<boolean> {
    const keys = await this.keys();
    return keys.includes(key);
  }

  async keys(): Promise<string[]> {
    const api = getTaikApi();
    return await api.store.keys();
  }

  async clear(): Promise<void> {
    const api = getTaikApi();
    await api.store.clear();
  }

  subscribe<T>(key: string, callback: StorageChangeCallback<T>): Unsubscribe {
    if (!this.listeners.has(key)) this.listeners.set(key, new Set());
    this.listeners.get(key)!.add(callback as any);
    return () => {
      this.listeners.get(key)?.delete(callback as any);
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
}

