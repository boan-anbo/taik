/**
 * Storage Adapter Configuration
 *
 * This module provides a way to inject platform-specific storage adapters
 * into the domain stores. Each platform (mobile, desktop, web) provides
 * its own implementation of IStorageAdapter.
 */

import type { IStorageAdapter } from '@taik/capabilities';

/**
 * The configured storage adapter instance
 */
let storageAdapter: IStorageAdapter | null = null;

/**
 * Listeners for storage changes (platform-specific)
 */
type StorageChangeHandler = (event: { key: string; buttons?: unknown[] }) => void;
const changeListeners: Map<string, Set<StorageChangeHandler>> = new Map();

/**
 * Configure the storage adapter for all domain stores
 * Must be called before using any stores
 *
 * @param adapter - Platform-specific storage adapter implementation
 */
export function configureStorageAdapter(adapter: IStorageAdapter): void {
  storageAdapter = adapter;
}

/**
 * Get the configured storage adapter
 * Throws if not configured
 */
export function getStorageAdapter(): IStorageAdapter {
  if (!storageAdapter) {
    throw new Error(
      'Storage adapter not configured. Call configureStorageAdapter() before using stores.'
    );
  }
  return storageAdapter;
}

/**
 * Check if storage adapter is configured
 */
export function isStorageConfigured(): boolean {
  return storageAdapter !== null;
}

/**
 * Add a listener for storage key changes
 * Returns an unsubscribe function
 */
export function addStorageChangeListener(
  key: string,
  handler: StorageChangeHandler
): () => void {
  if (!changeListeners.has(key)) {
    changeListeners.set(key, new Set());
  }
  changeListeners.get(key)!.add(handler);

  // If adapter supports subscriptions, set it up
  let unsubscribeFromAdapter: (() => void) | null = null;
  if (storageAdapter) {
    unsubscribeFromAdapter = storageAdapter.subscribe(key, (value) => {
      handler({ key, buttons: value as unknown[] });
    });
  }

  return () => {
    changeListeners.get(key)?.delete(handler);
    unsubscribeFromAdapter?.();
  };
}

/**
 * Emit a storage change event (for adapters that don't support native subscriptions)
 */
export function emitStorageChange(key: string, data: unknown): void {
  const listeners = changeListeners.get(key);
  if (listeners) {
    for (const handler of listeners) {
      handler({ key, buttons: data as unknown[] });
    }
  }
}
