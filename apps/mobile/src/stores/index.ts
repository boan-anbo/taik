/**
 * Store exports and initialization
 *
 * Domain stores (settings, deck) are imported from @taik/domain.
 * FlowSession store is mobile-specific and kept local.
 */

import {
  initializeStores as initializeDomainStores,
  cleanupStores as cleanupDomainStores,
} from '@taik/domain';
import {
  useFlowSessionStore,
  setupFlowSessionSync,
  cleanupFlowSessionSync,
  formatTimeRemaining,
} from './flowSessionStore';

// Re-export domain stores
export { useSettingsStore, useDeckStore } from '@taik/domain';

// Re-export domain helpers
export { getEngineDisplayName, getEngineDescription } from '@taik/domain';

// Export local stores
export { useFlowSessionStore, formatTimeRemaining } from './flowSessionStore';

/**
 * Initialize all stores and set up sync
 * Call this in App.tsx on mount AFTER configureStorageAdapter()
 */
export function initializeStores() {
  // Initialize domain stores (settings, deck)
  initializeDomainStores();

  // Set up mobile-specific flow session sync
  setupFlowSessionSync();
}

/**
 * Cleanup all store subscriptions
 * Call this in App.tsx on unmount
 */
export function cleanupStores() {
  // Cleanup domain stores
  cleanupDomainStores();

  // Cleanup mobile-specific flow session
  cleanupFlowSessionSync();
}
