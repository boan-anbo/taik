/**
 * Speech Provider Registry
 *
 * Central registry for all available speech providers.
 * Allows dynamic registration and creation of providers.
 */

import type {
  ProviderInfo,
  SpeechProvider,
  SpeechProviderConfig,
  SpeechProviderFactory,
} from './types.js';

/**
 * Provider registry - singleton for managing available providers
 */
class ProviderRegistry {
  private providers = new Map<string, ProviderInfo>();

  /**
   * Register a new provider
   */
  register(info: ProviderInfo): void {
    if (this.providers.has(info.id)) {
      throw new Error(`Provider '${info.id}' is already registered`);
    }
    this.providers.set(info.id, info);
  }

  /**
   * Unregister a provider
   */
  unregister(id: string): boolean {
    return this.providers.delete(id);
  }

  /**
   * Get provider info by ID
   */
  get(id: string): ProviderInfo | undefined {
    return this.providers.get(id);
  }

  /**
   * Get all registered providers
   */
  list(): ProviderInfo[] {
    return Array.from(this.providers.values());
  }

  /**
   * Check if a provider is registered
   */
  has(id: string): boolean {
    return this.providers.has(id);
  }

  /**
   * Create a provider instance
   */
  create(
    id: string,
    credentials: Record<string, string>,
    config?: SpeechProviderConfig
  ): SpeechProvider {
    const info = this.providers.get(id);
    if (!info) {
      throw new Error(`Provider '${id}' is not registered`);
    }

    // Validate required credentials
    for (const key of info.requiredCredentials) {
      if (!credentials[key]) {
        throw new Error(`Missing required credential '${key}' for provider '${id}'`);
      }
    }

    return info.factory(credentials, config);
  }
}

// Export singleton instance
export const providerRegistry = new ProviderRegistry();

/**
 * Helper to register a provider
 */
export function registerProvider(info: ProviderInfo): void {
  providerRegistry.register(info);
}

/**
 * Helper to create a provider
 */
export function createProvider(
  id: string,
  credentials: Record<string, string>,
  config?: SpeechProviderConfig
): SpeechProvider {
  return providerRegistry.create(id, credentials, config);
}
