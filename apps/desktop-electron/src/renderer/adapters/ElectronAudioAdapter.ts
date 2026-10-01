import type { IAudioAdapter, AudioFileMetadata, PlaybackState, PlaybackProgressCallback } from '@taik/capabilities';
import { AudioError } from '@taik/capabilities';
import { getTaikApi } from '../platform/taik';

export class ElectronAudioAdapter implements IAudioAdapter {
  private audioContext: AudioContext | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;
  private gainNode: GainNode | null = null;

  private playbackState: PlaybackState = 'idle';
  private startTime = 0;
  private pausedAt = 0;
  private duration = 0;

  private progressCallbacks = new Set<PlaybackProgressCallback>();
  private stateCallbacks = new Set<(state: PlaybackState) => void>();
  private progressInterval: number | null = null;

  async pickAudioFile(): Promise<string | null> {
    const api = getTaikApi();
    const result = await api.dialog.open({
      properties: ['openFile'],
      filters: [{ name: 'Audio Files', extensions: ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac', 'webm'] }],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  }

  private getAudioContext(): AudioContext {
    if (!this.audioContext) this.audioContext = new AudioContext();
    return this.audioContext;
  }

  async getAudioMetadata(path: string): Promise<AudioFileMetadata> {
    try {
      const api = getTaikApi();
      const exists = await api.fs.exists(path);
      if (!exists) throw new AudioError('FILE_NOT_FOUND', `File not found: ${path}`);
      const data = await api.fs.readFile(path);
      const name = path.split('/').pop() ?? 'unknown';
      const format = name.split('.').pop()?.toLowerCase();

      const ctx = this.getAudioContext();
      const buffer = await ctx.decodeAudioData(data.slice(0));
      return {
        path,
        name,
        size: data.byteLength,
        duration: buffer.duration,
        format,
        sampleRate: buffer.sampleRate,
        channels: buffer.numberOfChannels,
      };
    } catch (err) {
      if (err instanceof AudioError) throw err;
      throw new AudioError('UNKNOWN', `Failed to get metadata for: ${path}`, err);
    }
  }

  async readAudioFile(path: string): Promise<ArrayBuffer> {
    const api = getTaikApi();
    const exists = await api.fs.exists(path);
    if (!exists) throw new AudioError('FILE_NOT_FOUND', `File not found: ${path}`);
    return await api.fs.readFile(path);
  }

  async saveAudioFile(data: ArrayBuffer, suggestedName?: string): Promise<string> {
    const api = getTaikApi();
    const result = await api.dialog.save({
      defaultPath: suggestedName,
      filters: [{ name: 'Audio Files', extensions: ['wav', 'mp3', 'webm'] }],
    });
    if (result.canceled || !result.filePath) throw new AudioError('UNKNOWN', 'Save cancelled');
    await api.fs.writeFile(result.filePath, data);
    return result.filePath;
  }

  async fileExists(path: string): Promise<boolean> {
    return await getTaikApi().fs.exists(path);
  }

  async loadAudio(pathOrBuffer: string | ArrayBuffer): Promise<void> {
    await this.stop();
    const ctx = this.getAudioContext();
    const arrayBuffer = typeof pathOrBuffer === 'string' ? await this.readAudioFile(pathOrBuffer) : pathOrBuffer.slice(0);
    try {
      this.audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      this.duration = this.audioBuffer.duration;
      this.pausedAt = 0;
      this.setPlaybackState('idle');
    } catch (err) {
      throw new AudioError('INVALID_FORMAT', 'Failed to decode audio', err);
    }
  }

  async play(): Promise<void> {
    if (!this.audioBuffer) throw new AudioError('PLAYBACK_ERROR', 'No audio loaded');
    if (this.playbackState === 'playing') return;

    const ctx = this.getAudioContext();
    if (ctx.state === 'suspended') await ctx.resume();

    this.sourceNode = ctx.createBufferSource();
    this.sourceNode.buffer = this.audioBuffer;
    this.gainNode = ctx.createGain();
    this.sourceNode.connect(this.gainNode);
    this.gainNode.connect(ctx.destination);

    this.sourceNode.onended = () => {
      if (this.playbackState === 'playing') {
        this.setPlaybackState('stopped');
        this.pausedAt = 0;
        this.stopProgressUpdates();
      }
    };

    this.startTime = ctx.currentTime - this.pausedAt;
    this.sourceNode.start(0, this.pausedAt);
    this.setPlaybackState('playing');
    this.startProgressUpdates();
  }

  async pause(): Promise<void> {
    if (this.playbackState !== 'playing') return;
    const ctx = this.getAudioContext();
    this.pausedAt = ctx.currentTime - this.startTime;
    this.sourceNode?.stop();
    this.sourceNode?.disconnect();
    this.sourceNode = null;
    this.setPlaybackState('paused');
    this.stopProgressUpdates();
  }

  async stop(): Promise<void> {
    if (this.sourceNode) {
      try {
        this.sourceNode.stop();
        this.sourceNode.disconnect();
      } catch {
        // ignore
      }
      this.sourceNode = null;
    }
    this.pausedAt = 0;
    this.setPlaybackState('stopped');
    this.stopProgressUpdates();
  }

  async seek(time: number): Promise<void> {
    if (!this.audioBuffer) return;
    const wasPlaying = this.playbackState === 'playing';
    if (wasPlaying) await this.pause();
    this.pausedAt = Math.max(0, Math.min(time, this.duration));
    if (wasPlaying) await this.play();
    this.notifyProgress();
  }

  getPlaybackState(): PlaybackState {
    return this.playbackState;
  }

  getCurrentTime(): number {
    if (this.playbackState === 'playing' && this.audioContext) {
      return this.audioContext.currentTime - this.startTime;
    }
    return this.pausedAt;
  }

  getDuration(): number {
    return this.duration;
  }

  async setVolume(volume: number): Promise<void> {
    if (this.gainNode) this.gainNode.gain.value = Math.max(0, Math.min(1, volume));
  }

  onProgress(callback: PlaybackProgressCallback): () => void {
    this.progressCallbacks.add(callback);
    return () => this.progressCallbacks.delete(callback);
  }

  onStateChange(callback: (state: PlaybackState) => void): () => void {
    this.stateCallbacks.add(callback);
    return () => this.stateCallbacks.delete(callback);
  }

  async getAudioDirectory(): Promise<string> {
    const api = getTaikApi();
    const base = await api.path.userData();
    const dir = await api.path.join(base, 'recordings');
    const exists = await api.fs.exists(dir);
    if (!exists) await api.fs.mkdir(dir);
    return dir;
  }

  async saveRecordedAudio(data: ArrayBuffer, metadata: { duration: number; timestamp: number; format?: string }): Promise<string> {
    const api = getTaikApi();
    const dir = await this.getAudioDirectory();
    const format = metadata.format ?? 'webm';
    const fileName = `recording-${metadata.timestamp}-${Math.random().toString(36).substring(2, 8)}.${format}`;
    const filePath = await api.path.join(dir, fileName);
    await api.fs.writeFile(filePath, data);
    return filePath;
  }

  async deleteAudioFile(uri: string): Promise<void> {
    const api = getTaikApi();
    const exists = await api.fs.exists(uri);
    if (exists) await api.fs.remove(uri);
  }

  async hasMicrophonePermission(): Promise<boolean> {
    // Best effort: renderer doesn't reliably know macOS permission status. We try and return true.
    return true;
  }

  async requestMicrophonePermission(): Promise<boolean> {
    // Electron main process requests on startup; we return true.
    return true;
  }

  private setPlaybackState(state: PlaybackState): void {
    if (this.playbackState === state) return;
    this.playbackState = state;
    for (const cb of this.stateCallbacks) {
      try { cb(state); } catch { /* ignore */ }
    }
  }

  private notifyProgress(): void {
    const currentTime = this.getCurrentTime();
    for (const cb of this.progressCallbacks) {
      try { cb(currentTime, this.duration); } catch { /* ignore */ }
    }
  }

  private startProgressUpdates(): void {
    this.stopProgressUpdates();
    this.progressInterval = window.setInterval(() => this.notifyProgress(), 100);
  }

  private stopProgressUpdates(): void {
    if (this.progressInterval !== null) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  }
}

