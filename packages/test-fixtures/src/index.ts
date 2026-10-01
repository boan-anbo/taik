/**
 * Test Fixtures
 *
 * Shared test assets and utilities for cross-platform testing.
 *
 * Usage varies by platform:
 *
 * @example Web/Storybook (fetch from URL)
 * ```typescript
 * import { AUDIO_ASSETS } from '@taik/test-fixtures';
 * const response = await fetch(AUDIO_ASSETS.taikTestAudio.url);
 * const arrayBuffer = await response.arrayBuffer();
 * ```
 *
 * @example Node.js/Vitest (read from file)
 * ```typescript
 * import { getAudioAssetPath } from '@taik/test-fixtures';
 * import { readFile } from 'fs/promises';
 * const buffer = await readFile(getAudioAssetPath('taik-test-audio.m4a'));
 * ```
 *
 * @example iOS/Maestro
 * ```yaml
 * # Use the path directly in Maestro flows
 * - inputFile:
 *     path: ../packages/test-fixtures/assets/audio/taik-test-audio.m4a
 * ```
 */

export * from './audio';
export * from './paths';
