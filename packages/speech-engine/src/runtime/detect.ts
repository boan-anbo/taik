/**
 * Runtime detection and adapter factory
 */

import type { RuntimeType, RuntimeAdapter } from './adapter.js';

/**
 * Detect the current runtime environment
 */
export function detectRuntime(): RuntimeType {
  // Check for React Native (must be before browser check)
  // React Native has navigator but no document, and has a specific product
  if (
    typeof navigator !== 'undefined' &&
    navigator.product === 'ReactNative'
  ) {
    return 'react-native';
  }

  // Check for browser-like environments (including Electron renderer)
  // Electron renderer exposes `process.versions.node` even when Node integration is disabled,
  // but it should use the browser adapter for microphone/WebAudio APIs.
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    return 'browser';
  }

  // Check for Cloudflare Workers
  if (typeof caches !== 'undefined' && typeof navigator !== 'undefined') {
    // Cloudflare Workers have a specific navigator.userAgent
    if (
      typeof navigator.userAgent === 'string' &&
      navigator.userAgent.includes('Cloudflare-Workers')
    ) {
      return 'cloudflare';
    }
  }

  // Check for Bun
  if (typeof (globalThis as { Bun?: unknown }).Bun !== 'undefined') {
    return 'bun';
  }

  // Check for Deno
  if (typeof (globalThis as { Deno?: unknown }).Deno !== 'undefined') {
    return 'deno';
  }

  // Check for Node.js
  if (
    typeof process !== 'undefined' &&
    process.versions &&
    process.versions.node
  ) {
    return 'node';
  }

  // Edge runtime or unknown
  if (typeof globalThis !== 'undefined' && typeof fetch !== 'undefined') {
    // Likely an edge runtime (Vercel Edge, etc.)
    return 'unknown';
  }

  return 'unknown';
}

// Cached adapter instance
let cachedAdapter: RuntimeAdapter | null = null;

/**
 * Get the runtime adapter for the current environment
 * Caches the adapter for subsequent calls
 */
export async function getRuntimeAdapter(): Promise<RuntimeAdapter> {
  if (cachedAdapter) {
    return cachedAdapter;
  }

  const runtime = detectRuntime();

  switch (runtime) {
    case 'browser': {
      const { BrowserAdapter } = await import('./browser-adapter.js');
      cachedAdapter = new BrowserAdapter();
      break;
    }
    case 'react-native': {
      const { ReactNativeAdapter } = await import('./react-native-adapter.js');
      cachedAdapter = new ReactNativeAdapter();
      break;
    }
    case 'node':
    case 'bun': {
      // Bun is Node-compatible for our purposes
      const { NodeAdapter } = await import('./node-adapter.js');
      cachedAdapter = new NodeAdapter(runtime);
      break;
    }
    case 'cloudflare':
    case 'deno':
    case 'unknown': {
      // Edge runtimes: use browser-like adapter but with limited audio support
      const { EdgeAdapter } = await import('./edge-adapter.js');
      cachedAdapter = new EdgeAdapter(runtime);
      break;
    }
  }

  return cachedAdapter!;
}

/**
 * Reset the cached adapter (useful for testing)
 */
export function resetRuntimeAdapter(): void {
  cachedAdapter = null;
}
