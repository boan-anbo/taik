/**
 * Audio Test Assets
 *
 * Metadata and utilities for audio test files.
 */

export interface AudioAsset {
  /** Asset file name */
  name: string;
  /** File extension */
  extension: string;
  /** MIME type */
  mimeType: string;
  /** Relative path from package root */
  relativePath: string;
  /** Description of the audio content */
  description: string;
}

/**
 * Available audio test assets
 */
export const AUDIO_ASSETS = {
  /**
   * Primary test audio file (M4A format)
   * Apple Voice Memo format, commonly used on iOS
   */
  taikTestAudio: {
    name: 'taik-test-audio',
    extension: 'm4a',
    mimeType: 'audio/mp4',
    relativePath: 'assets/audio/taik-test-audio.m4a',
    description: 'Test audio recording for transcription testing',
  },
} as const satisfies Record<string, AudioAsset>;

export type AudioAssetKey = keyof typeof AUDIO_ASSETS;

/**
 * Get audio asset metadata by key
 */
export function getAudioAsset(key: AudioAssetKey): AudioAsset {
  return AUDIO_ASSETS[key];
}

/**
 * Get the file name with extension for an audio asset
 */
export function getAudioFileName(key: AudioAssetKey): string {
  const asset = AUDIO_ASSETS[key];
  return `${asset.name}.${asset.extension}`;
}
