/**
 * Path Utilities for Test Assets
 *
 * Platform-specific path resolution for test fixtures.
 */

import { AUDIO_ASSETS, type AudioAssetKey } from './audio';

/**
 * Get the absolute file path for an audio asset (Node.js only)
 *
 * @example
 * ```typescript
 * import { getAudioAssetPath } from '@taik/test-fixtures';
 * import { readFile } from 'fs/promises';
 *
 * const path = getAudioAssetPath('taikTestAudio');
 * const buffer = await readFile(path);
 * ```
 */
export function getAudioAssetPath(key: AudioAssetKey): string {
  const asset = AUDIO_ASSETS[key];
  // This resolves relative to the package location
  // In Node.js, use with path.resolve(__dirname, '..', asset.relativePath)
  return asset.relativePath;
}

/**
 * Get the relative path from a specific directory to an audio asset
 *
 * @param key - Audio asset key
 * @param fromDir - The directory you're resolving from (e.g., 'apps/mobile')
 * @returns Relative path to the asset
 *
 * @example
 * ```typescript
 * // From apps/mobile/.maestro/flows/
 * const path = getRelativeAudioPath('taikTestAudio', 'apps/mobile/.maestro/flows');
 * // Returns: '../../../../packages/test-fixtures/assets/audio/taik-test-audio.m4a'
 * ```
 */
export function getRelativeAudioPath(key: AudioAssetKey, fromDir: string): string {
  const asset = AUDIO_ASSETS[key];
  const depth = fromDir.split('/').filter(Boolean).length;
  const upDirs = '../'.repeat(depth);
  return `${upDirs}packages/test-fixtures/${asset.relativePath}`;
}

/**
 * Asset URL patterns for different environments
 */
export const ASSET_URL_PATTERNS = {
  /**
   * For Storybook static serving
   * Assets should be copied to public/ or served via storybook static dirs
   */
  storybook: (assetPath: string) => `/test-fixtures/${assetPath}`,

  /**
   * For Vite dev server
   * Use the package path directly with ?url suffix
   */
  vite: (assetPath: string) => `@taik/test-fixtures/${assetPath}`,
} as const;
