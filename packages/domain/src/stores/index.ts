/**
 * Domain Stores
 * Re-export all stores and initialization functions
 */

// Adapter configuration
export {
  configureStorageAdapter,
  getStorageAdapter,
  isStorageConfigured,
} from './adapter';

// Settings store
export { useSettingsStore, setupSettingsStoreSync, cleanupSettingsStoreSync } from './settingsStore';

// Deck store
export { useDeckStore, setupDeckStoreSync, cleanupDeckStoreSync } from './deckStore';

// Transcript store
export {
  useTranscriptStore,
  setupTranscriptStoreSync,
  cleanupTranscriptStoreSync,
} from './transcriptStore';

// Voice store
export {
  useVoiceStore,
  setupVoiceStoreSync,
  cleanupVoiceStoreSync,
} from './voiceStore';

// Re-export types
export type { IStorageAdapter } from '@taik/capabilities';

/**
 * Initialize all stores and set up sync
 * Call this in App initialization after configuring the storage adapter
 */
export function initializeStores(): void {
  // Import sync setup functions
  const { setupSettingsStoreSync } = require('./settingsStore');
  const { setupDeckStoreSync } = require('./deckStore');
  const { setupTranscriptStoreSync } = require('./transcriptStore');
  const { setupVoiceStoreSync } = require('./voiceStore');

  // Set up sync for all stores
  setupSettingsStoreSync();
  setupDeckStoreSync();
  setupTranscriptStoreSync();
  setupVoiceStoreSync();
}

/**
 * Cleanup all store subscriptions
 * Call this in App cleanup
 */
export function cleanupStores(): void {
  // Import cleanup functions
  const { cleanupSettingsStoreSync } = require('./settingsStore');
  const { cleanupDeckStoreSync } = require('./deckStore');
  const { cleanupTranscriptStoreSync } = require('./transcriptStore');
  const { cleanupVoiceStoreSync } = require('./voiceStore');

  // Clean up all stores
  cleanupSettingsStoreSync();
  cleanupDeckStoreSync();
  cleanupTranscriptStoreSync();
  cleanupVoiceStoreSync();
}
