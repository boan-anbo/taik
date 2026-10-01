/**
 * Tauri Audio Adapter
 * Implements IAudioAdapter for file operations and playback
 *
 * Note: Real-time recording for STT is handled by @taik/speech-engine.
 * This adapter handles file I/O and audio playback using Web Audio API.
 */

import { open, save } from '@tauri-apps/plugin-dialog';
import { readFile, writeFile, exists, mkdir, remove } from '@tauri-apps/plugin-fs';
import { appDataDir, join } from '@tauri-apps/api/path';
import type {
  IAudioAdapter,
  AudioFileMetadata,
  PlaybackState,
  PlaybackProgressCallback,
} from '@taik/capabilities';
import { AudioError } from '@taik/capabilities';

/**
 * Audio adapter implementation for Tauri desktop app
 */
export class TauriAudioAdapter implements IAudioAdapter {
  private audioContext: AudioContext | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private audioElementUrl: string | null = null;
  private useAudioElement = false;

  private playbackState: PlaybackState = 'idle';
  private startTime: number = 0;
  private pausedAt: number = 0;
  private duration: number = 0;

  private progressCallbacks: Set<PlaybackProgressCallback> = new Set();
  private stateCallbacks: Set<(state: PlaybackState) => void> = new Set();
  private progressInterval: number | null = null;

  // ===========================================================================
  // FILE OPERATIONS
  // ===========================================================================

  async pickAudioFile(): Promise<string | null> {
    try {
      const result = await open({
        multiple: false,
        directory: false,
        filters: [
          {
            name: 'Audio Files',
            extensions: ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'],
          },
        ],
      });
      return result ?? null;
    } catch (error) {
      throw new AudioError('UNKNOWN', 'Failed to open file picker', error);
    }
  }

  async getAudioMetadata(path: string): Promise<AudioFileMetadata> {
    try {
      const fileExists = await exists(path);
      if (!fileExists) {
        throw new AudioError('FILE_NOT_FOUND', `File not found: ${path}`);
      }

      const data = await readFile(path);
      const name = path.split('/').pop() ?? 'unknown';
      const format = name.split('.').pop()?.toLowerCase();
      const arrayBuffer = data.buffer.slice(
        data.byteOffset,
        data.byteOffset + data.byteLength
      );

      // Get duration by decoding
      const ctx = this.getAudioContext();
      const buffer = await ctx.decodeAudioData(arrayBuffer);

      return {
        path,
        name,
        size: data.byteLength,
        duration: buffer.duration,
        format,
        sampleRate: buffer.sampleRate,
        channels: buffer.numberOfChannels,
      };
    } catch (error) {
      if (error instanceof AudioError) throw error;
      throw new AudioError('UNKNOWN', `Failed to get metadata for: ${path}`, error);
    }
  }

  async readAudioFile(path: string): Promise<ArrayBuffer> {
    try {
      const fileExists = await exists(path);
      if (!fileExists) {
        throw new AudioError('FILE_NOT_FOUND', `File not found: ${path}`);
      }

      const data = await readFile(path);
      return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
    } catch (error) {
      if (error instanceof AudioError) throw error;
      throw new AudioError('UNKNOWN', `Failed to read file: ${path}`, error);
    }
  }

  async saveAudioFile(data: ArrayBuffer, suggestedName?: string): Promise<string> {
    try {
      const path = await save({
        defaultPath: suggestedName,
        filters: [
          {
            name: 'Audio Files',
            extensions: ['wav', 'mp3'],
          },
        ],
      });

      if (!path) {
        throw new AudioError('UNKNOWN', 'Save cancelled');
      }

      await writeFile(path, new Uint8Array(data));
      return path;
    } catch (error) {
      if (error instanceof AudioError) throw error;
      throw new AudioError('UNKNOWN', 'Failed to save audio file', error);
    }
  }

  async fileExists(path: string): Promise<boolean> {
    try {
      return await exists(path);
    } catch {
      return false;
    }
  }

  // ===========================================================================
  // PLAYBACK
  // ===========================================================================

  private getAudioContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }
    return this.audioContext;
  }

  private inferMimeType(path?: string): string | undefined {
    if (!path) return undefined;
    const ext = path.split('.').pop()?.toLowerCase();
    if (!ext) return undefined;
    const map: Record<string, string> = {
      webm: 'audio/webm',
      wav: 'audio/wav',
      mp3: 'audio/mpeg',
      m4a: 'audio/mp4',
      mp4: 'audio/mp4',
      aac: 'audio/aac',
      ogg: 'audio/ogg',
      flac: 'audio/flac',
    };
    return map[ext];
  }

  private resetAudioElement(): void {
    if (!this.audioElement) return;
    try {
      this.audioElement.pause();
    } catch {
      // ignore
    }
    this.audioElement.onended = null;
    this.audioElement.src = '';
    this.audioElement.load();
    this.audioElement = null;
    if (this.audioElementUrl) {
      URL.revokeObjectURL(this.audioElementUrl);
      this.audioElementUrl = null;
    }
  }

  private async loadAudioElement(pathOrBuffer: string | ArrayBuffer, data: ArrayBuffer): Promise<void> {
    const mimeType = typeof pathOrBuffer === 'string' ? this.inferMimeType(pathOrBuffer) : 'audio/webm';
    const blob = mimeType ? new Blob([data], { type: mimeType }) : new Blob([data]);
    const objectUrl = URL.createObjectURL(blob);
    const audio = new Audio(objectUrl);

    await new Promise<void>((resolve, reject) => {
      const onLoaded = () => {
        audio.removeEventListener('loadedmetadata', onLoaded);
        audio.removeEventListener('error', onError);
        resolve();
      };
      const onError = () => {
        audio.removeEventListener('loadedmetadata', onLoaded);
        audio.removeEventListener('error', onError);
        reject(new Error('Failed to load audio metadata'));
      };
      audio.addEventListener('loadedmetadata', onLoaded);
      audio.addEventListener('error', onError);
      audio.load();
    });

    this.resetAudioElement();
    this.audioElement = audio;
    this.audioElementUrl = objectUrl;
    this.audioElement.onended = () => {
      if (this.playbackState === 'playing') {
        this.setPlaybackState('stopped');
        this.pausedAt = 0;
        this.stopProgressUpdates();
      }
    };
    this.duration = Number.isFinite(audio.duration) ? audio.duration : 0;
    this.pausedAt = 0;
    this.useAudioElement = true;
  }

  async loadAudio(pathOrBuffer: string | ArrayBuffer): Promise<void> {
    try {
      await this.stop();
      this.resetAudioElement();
      this.useAudioElement = false;

      const ctx = this.getAudioContext();
      let arrayBuffer: ArrayBuffer;

      if (typeof pathOrBuffer === 'string') {
        arrayBuffer = await this.readAudioFile(pathOrBuffer);
      } else {
        arrayBuffer = pathOrBuffer.slice(0);
      }

      try {
        this.audioBuffer = await ctx.decodeAudioData(arrayBuffer);
        this.duration = this.audioBuffer.duration;
        this.pausedAt = 0;
        this.setPlaybackState('idle');
      } catch (decodeError) {
        this.audioBuffer = null;
        await this.loadAudioElement(pathOrBuffer, arrayBuffer);
        this.setPlaybackState('idle');
        if (import.meta.env.DEV) {
          console.warn('[TauriAudioAdapter] WebAudio decode failed, fell back to HTMLAudioElement', decodeError);
        }
      }
    } catch (error) {
      if (error instanceof AudioError) throw error;
      throw new AudioError('INVALID_FORMAT', 'Failed to decode audio', error);
    }
  }

  async play(): Promise<void> {
    if (this.useAudioElement) {
      if (!this.audioElement) {
        throw new AudioError('PLAYBACK_ERROR', 'No audio loaded');
      }
      await this.audioElement.play();
      this.setPlaybackState('playing');
      this.startProgressUpdates();
      return;
    }

    if (!this.audioBuffer) {
      throw new AudioError('PLAYBACK_ERROR', 'No audio loaded');
    }

    if (this.playbackState === 'playing') return;

    const ctx = this.getAudioContext();

    // Resume audio context if suspended
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    // Create source and gain nodes
    this.sourceNode = ctx.createBufferSource();
    this.sourceNode.buffer = this.audioBuffer;

    this.gainNode = ctx.createGain();
    this.sourceNode.connect(this.gainNode);
    this.gainNode.connect(ctx.destination);

    // Handle playback end
    this.sourceNode.onended = () => {
      if (this.playbackState === 'playing') {
        this.setPlaybackState('stopped');
        this.pausedAt = 0;
        this.stopProgressUpdates();
      }
    };

    // Start playback
    this.startTime = ctx.currentTime - this.pausedAt;
    this.sourceNode.start(0, this.pausedAt);
    this.setPlaybackState('playing');
    this.startProgressUpdates();
  }

  async pause(): Promise<void> {
    if (this.playbackState !== 'playing') return;

    if (this.useAudioElement) {
      if (!this.audioElement) return;
      this.audioElement.pause();
      this.pausedAt = this.audioElement.currentTime;
      this.setPlaybackState('paused');
      this.stopProgressUpdates();
      return;
    }

    const ctx = this.getAudioContext();
    this.pausedAt = ctx.currentTime - this.startTime;

    this.sourceNode?.stop();
    this.sourceNode?.disconnect();
    this.sourceNode = null;

    this.setPlaybackState('paused');
    this.stopProgressUpdates();
  }

  async stop(): Promise<void> {
    if (this.useAudioElement) {
      if (this.audioElement) {
        try {
          this.audioElement.pause();
          this.audioElement.currentTime = 0;
        } catch {
          // ignore
        }
      }
      this.pausedAt = 0;
      this.setPlaybackState('stopped');
      this.stopProgressUpdates();
      return;
    }

    if (this.sourceNode) {
      try {
        this.sourceNode.stop();
        this.sourceNode.disconnect();
      } catch {
        // Ignore if already stopped
      }
      this.sourceNode = null;
    }

    this.pausedAt = 0;
    this.setPlaybackState('stopped');
    this.stopProgressUpdates();
  }

  async seek(time: number): Promise<void> {
    if (this.useAudioElement) {
      if (!this.audioElement) return;
      const clamped = Math.max(0, Math.min(time, this.duration || this.audioElement.duration || 0));
      this.audioElement.currentTime = clamped;
      this.pausedAt = clamped;
      this.notifyProgress();
      return;
    }

    if (!this.audioBuffer) return;

    const wasPlaying = this.playbackState === 'playing';

    if (wasPlaying) {
      await this.pause();
    }

    this.pausedAt = Math.max(0, Math.min(time, this.duration));

    if (wasPlaying) {
      await this.play();
    }

    this.notifyProgress();
  }

  getPlaybackState(): PlaybackState {
    return this.playbackState;
  }

  getCurrentTime(): number {
    if (this.useAudioElement && this.audioElement) {
      return this.audioElement.currentTime;
    }
    if (this.playbackState === 'playing' && this.audioContext) {
      return this.audioContext.currentTime - this.startTime;
    }
    return this.pausedAt;
  }

  getDuration(): number {
    return this.duration;
  }

  async setVolume(volume: number): Promise<void> {
    if (this.useAudioElement && this.audioElement) {
      this.audioElement.volume = Math.max(0, Math.min(1, volume));
      return;
    }
    if (this.gainNode) {
      this.gainNode.gain.value = Math.max(0, Math.min(1, volume));
    }
  }

  onProgress(callback: PlaybackProgressCallback): () => void {
    this.progressCallbacks.add(callback);
    return () => {
      this.progressCallbacks.delete(callback);
    };
  }

  onStateChange(callback: (state: PlaybackState) => void): () => void {
    this.stateCallbacks.add(callback);
    return () => {
      this.stateCallbacks.delete(callback);
    };
  }

  // ===========================================================================
  // RECORDING STORAGE
  // ===========================================================================

  /**
   * Get the recordings directory, creating it if needed
   */
  async getAudioDirectory(): Promise<string> {
    try {
      const appData = await appDataDir();
      const recordingsDir = await join(appData, 'recordings');

      // Ensure directory exists
      const dirExists = await exists(recordingsDir);
      if (!dirExists) {
        await mkdir(recordingsDir, { recursive: true });
      }

      return recordingsDir;
    } catch (error) {
      throw new AudioError('UNKNOWN', 'Failed to get audio directory', error);
    }
  }

  /**
   * Save recorded audio to the recordings directory
   */
  async saveRecordedAudio(
    data: ArrayBuffer,
    metadata: {
      duration: number;
      timestamp: number;
      format?: string;
    }
  ): Promise<string> {
    try {
      const dir = await this.getAudioDirectory();
      const format = metadata.format ?? 'webm';
      const fileName = `recording-${metadata.timestamp}-${Math.random().toString(36).substring(2, 8)}.${format}`;
      const filePath = await join(dir, fileName);

      await writeFile(filePath, new Uint8Array(data));
      return filePath;
    } catch (error) {
      if (error instanceof AudioError) throw error;
      throw new AudioError('UNKNOWN', 'Failed to save recorded audio', error);
    }
  }

  /**
   * Delete an audio file
   */
  async deleteAudioFile(uri: string): Promise<void> {
    try {
      const fileExists = await exists(uri);
      if (fileExists) {
        await remove(uri);
      }
    } catch (error) {
      throw new AudioError('UNKNOWN', `Failed to delete audio file: ${uri}`, error);
    }
  }

  // ===========================================================================
  // PERMISSIONS
  // ===========================================================================

  async hasMicrophonePermission(): Promise<boolean> {
    try {
      const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      return result.state === 'granted';
    } catch {
      return false;
    }
  }

  async requestMicrophonePermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      return true;
    } catch {
      return false;
    }
  }

  // ===========================================================================
  // PRIVATE HELPERS
  // ===========================================================================

  private setPlaybackState(state: PlaybackState): void {
    if (this.playbackState === state) return;
    this.playbackState = state;
    for (const callback of this.stateCallbacks) {
      try {
        callback(state);
      } catch (error) {
        console.error('Error in state change callback:', error);
      }
    }
  }

  private notifyProgress(): void {
    const currentTime = this.getCurrentTime();
    for (const callback of this.progressCallbacks) {
      try {
        callback(currentTime, this.duration);
      } catch (error) {
        console.error('Error in progress callback:', error);
      }
    }
  }

  private startProgressUpdates(): void {
    this.stopProgressUpdates();
    this.progressInterval = window.setInterval(() => {
      this.notifyProgress();
    }, 100);
  }

  private stopProgressUpdates(): void {
    if (this.progressInterval !== null) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  }
}
