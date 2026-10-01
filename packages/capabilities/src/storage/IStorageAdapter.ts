/**
 * Storage Adapter Interface
 * Platform-agnostic contract for persistent key-value storage.
 *
 * Implementations:
 * - Mobile: SharedStorage (iOS App Groups)
 * - Desktop: Tauri Store plugin
 * - Web: localStorage/IndexedDB
 */

/**
 * Subscription callback for storage changes
 */
export type StorageChangeCallback<T> = (value: T | null, oldValue: T | null) => void;

/**
 * Unsubscribe function returned by subscribe()
 */
export type Unsubscribe = () => void;

/**
 * Storage adapter interface for platform-agnostic persistence
 */
export interface IStorageAdapter {
  /**
   * Get a value by key
   * @param key - Storage key
   * @returns The stored value or null if not found
   */
  get<T>(key: string): Promise<T | null>;

  /**
   * Set a value by key
   * @param key - Storage key
   * @param value - Value to store (must be JSON-serializable)
   */
  set<T>(key: string, value: T): Promise<void>;

  /**
   * Delete a value by key
   * @param key - Storage key
   */
  delete(key: string): Promise<void>;

  /**
   * Check if a key exists
   * @param key - Storage key
   */
  has(key: string): Promise<boolean>;

  /**
   * Get all keys in storage
   */
  keys(): Promise<string[]>;

  /**
   * Clear all stored data
   */
  clear(): Promise<void>;

  /**
   * Subscribe to changes for a specific key
   * @param key - Storage key to watch
   * @param callback - Called when value changes
   * @returns Unsubscribe function
   */
  subscribe<T>(key: string, callback: StorageChangeCallback<T>): Unsubscribe;

  /**
   * Get multiple values by keys (batch operation)
   * @param keys - Array of storage keys
   * @returns Map of key to value
   */
  getMultiple<T>(keys: string[]): Promise<Map<string, T | null>>;

  /**
   * Set multiple values (batch operation)
   * @param entries - Map of key to value
   */
  setMultiple<T>(entries: Map<string, T>): Promise<void>;
}

/**
 * Storage error types
 */
export type StorageErrorCode =
  | 'NOT_FOUND'
  | 'PERMISSION_DENIED'
  | 'QUOTA_EXCEEDED'
  | 'SERIALIZATION_ERROR'
  | 'UNKNOWN';

/**
 * Storage error class for typed error handling
 */
export class StorageError extends Error {
  constructor(
    public readonly code: StorageErrorCode,
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'StorageError';
  }
}
