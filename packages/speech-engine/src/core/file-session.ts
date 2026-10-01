/**
 * File Session - simplified API for file transcription
 * Returns a Promise with the complete transcript
 */

import type { SonioxConfig } from '../types/config.js';
import type { TranscriptResult } from '../types/events.js';
import type { FileSourceOptions, BufferSourceOptions } from '../types/audio.js';
import { SonioxSession } from './session.js';

/**
 * File transcription result
 */
export interface FileTranscriptionResult {
  /** Complete transcribed text */
  text: string;

  /** Individual transcript results with timing */
  results: TranscriptResult[];

  /** Total duration in milliseconds */
  durationMs: number;
}

/**
 * FileSession - simplified API for file transcription
 *
 * @example
 * ```typescript
 * const session = new FileSession({
 *   apiKey: 'your-api-key',
 *   features: {
 *     enableSpeakerDiarization: true,
 *   },
 * });
 *
 * const result = await session.transcribeFile({ path: './audio.wav' });
 * console.log(result.text);
 * ```
 */
export class FileSession {
  private config: SonioxConfig;

  constructor(config: SonioxConfig) {
    this.config = config;
  }

  /**
   * Transcribe a file and return the complete result
   */
  async transcribeFile(options: FileSourceOptions): Promise<FileTranscriptionResult> {
    const session = new SonioxSession(this.config);

    return new Promise((resolve, reject) => {
      let durationMs = 0;

      session.on('transcript', (result) => {
        if (result.totalAudioProcMs > durationMs) {
          durationMs = result.totalAudioProcMs;
        }
      });

      session.on('completed', ({ fullText, results }) => {
        session.dispose();
        resolve({
          text: fullText,
          results,
          durationMs,
        });
      });

      session.on('error', ({ error }) => {
        session.dispose();
        reject(error);
      });

      session.startFile(options).catch((error) => {
        session.dispose();
        reject(error);
      });
    });
  }

  /**
   * Transcribe an in-memory buffer and return the complete result
   */
  async transcribeBuffer(options: BufferSourceOptions): Promise<FileTranscriptionResult> {
    const session = new SonioxSession(this.config);

    return new Promise((resolve, reject) => {
      let durationMs = 0;

      session.on('transcript', (result) => {
        if (result.totalAudioProcMs > durationMs) {
          durationMs = result.totalAudioProcMs;
        }
      });

      session.on('completed', ({ fullText, results }) => {
        session.dispose();
        resolve({
          text: fullText,
          results,
          durationMs,
        });
      });

      session.on('error', ({ error }) => {
        session.dispose();
        reject(error);
      });

      session.startBuffer(options).catch((error) => {
        session.dispose();
        reject(error);
      });
    });
  }
}

/**
 * Convenience function for one-off file transcription
 *
 * @example
 * ```typescript
 * const result = await transcribeFile(
 *   { apiKey: 'your-api-key' },
 *   { path: './audio.wav' }
 * );
 * console.log(result.text);
 * ```
 */
export async function transcribeFile(
  config: SonioxConfig,
  options: FileSourceOptions
): Promise<FileTranscriptionResult> {
  const session = new FileSession(config);
  return session.transcribeFile(options);
}

/**
 * Convenience function for one-off buffer transcription
 */
export async function transcribeBuffer(
  config: SonioxConfig,
  options: BufferSourceOptions
): Promise<FileTranscriptionResult> {
  const session = new FileSession(config);
  return session.transcribeBuffer(options);
}
