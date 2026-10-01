/**
 * Files Screen
 * Transcript history and file management with file upload for async transcription
 */

import { useCallback, useEffect, useState, useRef } from 'react';
import { getSonioxApiKey, useTranscriptStore, useSettingsStore } from '@taik/domain';
import { tokens } from '@taik/ui-tokens';
import {
  AsyncFileSession,
  type AsyncTranscriptionProgress,
} from '@taik/speech-engine';
import type { PlaybackState } from '@taik/capabilities';
import { ElectronAudioAdapter } from '../adapters/ElectronAudioAdapter';
import { systemAdapter } from '../platform/system';
import { getTaikApi } from '../platform/taik';

export function FilesScreen() {
  const { entries, selectedId, selectEntry, deleteEntry, addEntry, isLoading } =
    useTranscriptStore();
  const { engineSettings } = useSettingsStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'live' | 'file'>('all');
  const [audioFilter, setAudioFilter] = useState<'all' | 'with-audio' | 'without-audio'>('all');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<AsyncTranscriptionProgress | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const sessionRef = useRef<AsyncFileSession | null>(null);

  // Playback (for history entries with saved audio)
  const audioAdapterRef = useRef(new ElectronAudioAdapter());
  const [playbackState, setPlaybackState] = useState<PlaybackState>('idle');
  const [playbackTime, setPlaybackTime] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(0);
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  useEffect(() => {
    const adapter = audioAdapterRef.current;
    const unsubState = adapter.onStateChange((s) => setPlaybackState(s));
    const unsubProgress = adapter.onProgress((t, d) => {
      setPlaybackTime(t);
      setPlaybackDuration(d);
    });
    return () => {
      unsubState();
      unsubProgress();
    };
  }, []);

  const filteredEntries = entries.filter((entry) => {
    if (sourceFilter !== 'all' && entry.source !== sourceFilter) return false;
    const hasAudio = Boolean(entry.metadata?.audioUri);
    if (audioFilter === 'with-audio' && !hasAudio) return false;
    if (audioFilter === 'without-audio' && hasAudio) return false;

    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      entry.text.toLowerCase().includes(q) ||
      entry.metadata?.fileName?.toLowerCase().includes(q)
    );
  });

  const selectedEntry = entries.find((e) => e.id === selectedId);

  // Load selected entry audio (if available)
  useEffect(() => {
    const adapter = audioAdapterRef.current;

    setPlaybackError(null);
    setPlaybackTime(0);
    setPlaybackDuration(0);

    const audioUri = selectedEntry?.metadata?.audioUri;
    if (!audioUri) {
      // Best effort stop
      adapter.stop().catch(() => {});
      return;
    }

    adapter
      .loadAudio(audioUri)
      .then(() => {
        setPlaybackDuration(adapter.getDuration());
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : 'Failed to load audio';
        setPlaybackError(message);
      });
  }, [selectedEntry?.id]);

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCopy = useCallback(async () => {
    if (selectedEntry) {
      await systemAdapter.copyToClipboard(selectedEntry.text);
    }
  }, [selectedEntry]);

  const handleCopyAudioPath = useCallback(async () => {
    const audioUri = selectedEntry?.metadata?.audioUri;
    if (!audioUri) return;
    await systemAdapter.copyToClipboard(audioUri);
  }, [selectedEntry?.metadata?.audioUri]);

  const handleExportAudio = useCallback(async () => {
    const audioUri = selectedEntry?.metadata?.audioUri;
    if (!audioUri) return;

    const api = getTaikApi();
    const fileName = audioUri.split('/').pop() ?? `taik-recording-${selectedEntry?.id}.webm`;
    const ext = fileName.includes('.') ? fileName.split('.').pop()!.toLowerCase() : 'webm';

    const result = await api.dialog.save({
      defaultPath: fileName,
      filters: [{ name: 'Audio', extensions: [ext] }],
    });
    if (result.canceled || !result.filePath) return;

    try {
      const data = await api.fs.readFile(audioUri);
      await api.fs.writeFile(result.filePath, data);
    } catch (err) {
      setPlaybackError(err instanceof Error ? err.message : 'Failed to export audio');
    }
  }, [selectedEntry?.id, selectedEntry?.metadata?.audioUri]);

  const handleDelete = useCallback(async () => {
    if (selectedEntry && confirm('Delete this transcript?')) {
      const audioUri = selectedEntry.metadata?.audioUri;
      if (audioUri && audioAdapterRef.current) {
        try {
          await audioAdapterRef.current.stop();
        } catch {
          // Ignore
        }
        try {
          await audioAdapterRef.current.deleteAudioFile(audioUri);
        } catch {
          // Ignore audio cleanup errors
        }
      }
      await deleteEntry(selectedEntry.id);
    }
  }, [selectedEntry, deleteEntry]);

  const handleExportAll = useCallback(async () => {
    const api = getTaikApi();
    const result = await api.dialog.save({
      defaultPath: `taik-history-${new Date().toISOString().replace(/[:.]/g, '-')}.json`,
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });
    if (result.canceled || !result.filePath) return;

    const payload = {
      exportedAt: new Date().toISOString(),
      count: filteredEntries.length,
      entries: filteredEntries,
    };
    const u8 = new TextEncoder().encode(JSON.stringify(payload, null, 2));
    await api.fs.writeFile(result.filePath, u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength));
  }, [filteredEntries]);

  const handleExportSelected = useCallback(async () => {
    if (!selectedEntry) return;
    const api = getTaikApi();
    const result = await api.dialog.save({
      defaultPath: `taik-transcript-${selectedEntry.id}.json`,
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });
    if (result.canceled || !result.filePath) return;

    const payload = {
      exportedAt: new Date().toISOString(),
      entry: selectedEntry,
    };
    const u8 = new TextEncoder().encode(JSON.stringify(payload, null, 2));
    await api.fs.writeFile(result.filePath, u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength));
  }, [selectedEntry]);

  const handlePlayPause = useCallback(async () => {
    const adapter = audioAdapterRef.current;
    if (!adapter) return;
    if (!selectedEntry?.metadata?.audioUri) return;

    try {
      if (playbackState === 'playing') {
        await adapter.pause();
      } else {
        await adapter.play();
      }
    } catch (err) {
      setPlaybackError(err instanceof Error ? err.message : 'Playback failed');
    }
  }, [playbackState, selectedEntry]);

  const handleSeek = useCallback(async (value: number) => {
    const adapter = audioAdapterRef.current;
    if (!adapter) return;
    try {
      await adapter.seek(value);
    } catch {
      // Ignore seek errors
    }
  }, []);

  // File upload handler
  const handleUploadFile = useCallback(async () => {
    // Check API key
    const apiKey = getSonioxApiKey(engineSettings);
    if (!apiKey) {
      setUploadError('Please configure your Soniox API key in Settings first.');
      return;
    }

    // Open file dialog
    const api = getTaikApi();
    const selected = await api.dialog.open({
      title: 'Select Audio File',
      properties: ['openFile'],
      filters: [
        {
          name: 'Audio Files',
          extensions: ['mp3', 'wav', 'flac', 'm4a', 'ogg', 'webm', 'mp4'],
        },
      ],
    });

    if (selected.canceled || selected.filePaths.length === 0) return;

    const filePath = selected.filePaths[0];
    const fileName = filePath.split('/').pop() || 'uploaded-file';

    setIsUploading(true);
    setUploadProgress(null);
    setUploadError(null);

    try {
      // Read the file
      const fileData = await api.fs.readFile(filePath);

      // Create async session
      const session = new AsyncFileSession({
        apiKey,
      });

      sessionRef.current = session;

      // Handle progress updates
      session.on('progress', (progress: AsyncTranscriptionProgress) => {
        setUploadProgress(progress);
      });

      // Handle completion
      session.on('complete', async (result) => {
        // Get duration from the result
        const durationSeconds = result.audioDurationMs ? result.audioDurationMs / 1000 : 1;

        // Add to transcript store
        await addEntry(result.text, 'file', durationSeconds, {
          fileName,
          engine: 'soniox',
          language: engineSettings.languageHints[0],
        });

        setIsUploading(false);
        setUploadProgress(null);
        sessionRef.current = null;
      });

      // Handle errors
      session.on('error', ({ error }) => {
        setUploadError(error.message || 'Transcription failed');
        setIsUploading(false);
        setUploadProgress(null);
        sessionRef.current = null;
      });

      // Start transcription with file
      await session.transcribeFile(fileData, fileName, {
        languageHints: engineSettings.languageHints,
      });
    } catch (error) {
      console.error('[FilesScreen] Upload error:', error);
      console.error('[FilesScreen] Error type:', typeof error);
      console.error('[FilesScreen] Error constructor:', error?.constructor?.name);
      if (error instanceof Error) {
        console.error('[FilesScreen] Error message:', error.message);
        console.error('[FilesScreen] Error stack:', error.stack);
      }
      setUploadError(error instanceof Error ? error.message : 'Failed to process file');
      setIsUploading(false);
      setUploadProgress(null);
    }
  }, [engineSettings, addEntry]);

  // Cancel upload
  const handleCancelUpload = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current.abort();
      sessionRef.current = null;
    }
    setIsUploading(false);
    setUploadProgress(null);
  }, []);

  return (
    <div className="screen" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="screen-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="screen-title">Files</h1>
        <div style={{ display: 'flex', gap: tokens.space.sm, alignItems: 'center' }}>
          <button
            onClick={() => void handleExportAll()}
            style={{
              backgroundColor: tokens.color.surface,
              color: tokens.color.text,
              padding: `${tokens.space.sm}px ${tokens.space.lg}px`,
              borderRadius: tokens.radius.md,
              border: `1px solid ${tokens.color.borderSubtle}`,
              fontSize: tokens.fontSize.sm,
              fontWeight: tokens.fontWeight.medium,
              cursor: 'pointer',
            }}
          >
            Export
          </button>
          <button
            onClick={handleUploadFile}
            disabled={isUploading}
            style={{
              backgroundColor: tokens.color.brand,
              color: 'white',
              padding: `${tokens.space.sm}px ${tokens.space.lg}px`,
              borderRadius: tokens.radius.md,
              border: 'none',
              fontSize: tokens.fontSize.sm,
              fontWeight: tokens.fontWeight.semibold,
              cursor: isUploading ? 'wait' : 'pointer',
              opacity: isUploading ? 0.7 : 1,
            }}
          >
            {isUploading ? 'Transcribing...' : '+ Upload Audio File'}
          </button>
        </div>
      </div>

      {/* Upload Progress */}
      {isUploading && uploadProgress && (
        <div
          style={{
            backgroundColor: tokens.color.surface,
            padding: tokens.space.md,
            borderRadius: tokens.radius.md,
            marginBottom: tokens.space.md,
            display: 'flex',
            alignItems: 'center',
            gap: tokens.space.md,
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: tokens.fontSize.sm, marginBottom: tokens.space.xs }}>
              {uploadProgress.status === 'queued' && `Queued: ${uploadProgress.progress}%`}
              {uploadProgress.status === 'processing' && `Processing: ${uploadProgress.progress}%`}
              {uploadProgress.status === 'completed' && `Completed: ${uploadProgress.progress}%`}
            </div>
            <div
              style={{
                height: 4,
                backgroundColor: tokens.color.borderSubtle,
                borderRadius: 2,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  backgroundColor: tokens.color.brand,
                  width: `${uploadProgress.progress}%`,
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>
          <button
            onClick={handleCancelUpload}
            style={{
              padding: `${tokens.space.xs}px ${tokens.space.sm}px`,
              backgroundColor: 'transparent',
              color: tokens.color.textSubtle,
              border: `1px solid ${tokens.color.borderSubtle}`,
              borderRadius: tokens.radius.sm,
              fontSize: tokens.fontSize.xs,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      )}

      {/* Upload Error */}
      {uploadError && (
        <div
          style={{
            backgroundColor: tokens.color.dangerSurface,
            padding: tokens.space.md,
            borderRadius: tokens.radius.md,
            marginBottom: tokens.space.md,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ color: tokens.color.danger, fontSize: tokens.fontSize.sm }}>
            {uploadError}
          </span>
          <button
            onClick={() => setUploadError(null)}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: tokens.color.danger,
              cursor: 'pointer',
              fontSize: tokens.fontSize.lg,
            }}
          >
            ×
          </button>
        </div>
      )}

      <div style={{ display: 'flex', flex: 1, gap: tokens.space.lg, minHeight: 0 }}>
        {/* Sidebar - Entry List */}
        <div
          style={{
            width: 300,
            minWidth: 300,
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: tokens.color.surface,
            borderRadius: tokens.radius.md,
            overflow: 'hidden',
          }}
        >
          {/* Search */}
          <div style={{ padding: tokens.space.md }}>
            <input
              type="text"
              placeholder="Search transcripts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: tokens.space.sm,
                borderRadius: tokens.radius.sm,
                border: `1px solid ${tokens.color.borderSubtle}`,
                fontSize: tokens.fontSize.sm,
              }}
            />
            <div style={{ display: 'flex', gap: tokens.space.sm, marginTop: tokens.space.sm }}>
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value as any)}
                style={{
                  flex: 1,
                  padding: tokens.space.xs,
                  borderRadius: tokens.radius.sm,
                  border: `1px solid ${tokens.color.borderSubtle}`,
                  fontSize: tokens.fontSize.xs,
                }}
              >
                <option value="all">All sources</option>
                <option value="live">Live</option>
                <option value="file">Files</option>
              </select>
              <select
                value={audioFilter}
                onChange={(e) => setAudioFilter(e.target.value as any)}
                style={{
                  flex: 1,
                  padding: tokens.space.xs,
                  borderRadius: tokens.radius.sm,
                  border: `1px solid ${tokens.color.borderSubtle}`,
                  fontSize: tokens.fontSize.xs,
                }}
              >
                <option value="all">All audio</option>
                <option value="with-audio">With audio</option>
                <option value="without-audio">No audio</option>
              </select>
            </div>
          </div>

          {/* Entry List */}
          <div style={{ flex: 1, overflow: 'auto' }}>
            {isLoading ? (
              <p style={{ padding: tokens.space.lg, textAlign: 'center', color: tokens.color.textSubtle }}>
                Loading...
              </p>
            ) : filteredEntries.length === 0 ? (
              <p style={{ padding: tokens.space.lg, textAlign: 'center', color: tokens.color.textSubtle }}>
                {searchQuery ? 'No matching transcripts' : 'No transcripts yet'}
              </p>
            ) : (
              filteredEntries.map((entry) => (
                <button
                  key={entry.id}
                  onClick={() => selectEntry(entry.id)}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: tokens.space.md,
                    textAlign: 'left',
                    border: 'none',
                    borderBottom: `1px solid ${tokens.color.borderSubtle}`,
                    backgroundColor:
                      selectedId === entry.id
                        ? tokens.color.brand
                        : 'transparent',
                    color: selectedId === entry.id ? 'white' : tokens.color.text,
                    cursor: 'pointer',
                  }}
                >
                  <div
                    style={{
                      fontSize: tokens.fontSize.sm,
                      fontWeight: tokens.fontWeight.medium,
                      marginBottom: 4,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {entry.text.substring(0, 50)}
                    {entry.text.length > 50 ? '...' : ''}
                  </div>
                  <div
                    style={{
                      fontSize: tokens.fontSize.xs,
                      color:
                        selectedId === entry.id
                          ? 'rgba(255,255,255,0.8)'
                          : tokens.color.textSubtle,
                      display: 'flex',
                      gap: tokens.space.sm,
                    }}
                  >
                    <span>{formatDate(entry.createdAt)}</span>
                    <span>·</span>
                    <span>{formatDuration(entry.duration)}</span>
                    <span>·</span>
                    <span>{entry.source === 'live' ? '🎙' : '📁'}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Main Content - Entry Detail */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: tokens.color.surface,
            borderRadius: tokens.radius.md,
            overflow: 'hidden',
          }}
        >
          {selectedEntry ? (
            <>
              {/* Header */}
              <div
                style={{
                  padding: tokens.space.lg,
                  borderBottom: `1px solid ${tokens.color.borderSubtle}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: tokens.fontSize.sm, color: tokens.color.textSubtle }}>
                    {formatDate(selectedEntry.createdAt)} · {formatDuration(selectedEntry.duration)}
                  </div>
                  {selectedEntry.metadata?.engine && (
                    <div style={{ fontSize: tokens.fontSize.xs, color: tokens.color.textSubtle, marginTop: 4 }}>
                      Engine: {selectedEntry.metadata.engine}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: tokens.space.sm }}>
                  {selectedEntry.metadata?.audioUri && (
                    <button
                      onClick={handlePlayPause}
                      style={{
                        padding: `${tokens.space.sm}px ${tokens.space.md}px`,
                        backgroundColor: tokens.color.surface,
                        color: tokens.color.text,
                        border: `1px solid ${tokens.color.borderSubtle}`,
                        borderRadius: tokens.radius.sm,
                        fontSize: tokens.fontSize.sm,
                        cursor: 'pointer',
                      }}
                    >
                      {playbackState === 'playing' ? 'Pause' : 'Play'}
                    </button>
                  )}
                  {selectedEntry.metadata?.audioUri && (
                    <button
                      onClick={() => void handleCopyAudioPath()}
                      style={{
                        padding: `${tokens.space.sm}px ${tokens.space.md}px`,
                        backgroundColor: tokens.color.surface,
                        color: tokens.color.text,
                        border: `1px solid ${tokens.color.borderSubtle}`,
                        borderRadius: tokens.radius.sm,
                        fontSize: tokens.fontSize.sm,
                        cursor: 'pointer',
                      }}
                    >
                      Copy audio path
                    </button>
                  )}
                  {selectedEntry.metadata?.audioUri && (
                    <button
                      onClick={() => void handleExportAudio()}
                      style={{
                        padding: `${tokens.space.sm}px ${tokens.space.md}px`,
                        backgroundColor: tokens.color.surface,
                        color: tokens.color.text,
                        border: `1px solid ${tokens.color.borderSubtle}`,
                        borderRadius: tokens.radius.sm,
                        fontSize: tokens.fontSize.sm,
                        cursor: 'pointer',
                      }}
                    >
                      Export audio
                    </button>
                  )}
                  <button
                    onClick={() => void handleExportSelected()}
                    style={{
                      padding: `${tokens.space.sm}px ${tokens.space.md}px`,
                      backgroundColor: tokens.color.surface,
                      color: tokens.color.text,
                      border: `1px solid ${tokens.color.borderSubtle}`,
                      borderRadius: tokens.radius.sm,
                      fontSize: tokens.fontSize.sm,
                      cursor: 'pointer',
                    }}
                  >
                    Export
                  </button>
                  <button
                    onClick={handleCopy}
                    style={{
                      padding: `${tokens.space.sm}px ${tokens.space.md}px`,
                      backgroundColor: tokens.color.brand,
                      color: 'white',
                      border: 'none',
                      borderRadius: tokens.radius.sm,
                      fontSize: tokens.fontSize.sm,
                      cursor: 'pointer',
                    }}
                  >
                    Copy
                  </button>
                  <button
                    onClick={handleDelete}
                    style={{
                      padding: `${tokens.space.sm}px ${tokens.space.md}px`,
                      backgroundColor: tokens.color.danger,
                      color: 'white',
                      border: 'none',
                      borderRadius: tokens.radius.sm,
                      fontSize: tokens.fontSize.sm,
                      cursor: 'pointer',
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>

              {/* Audio Playback */}
              {selectedEntry.metadata?.audioUri && (
                <div
                  style={{
                    padding: tokens.space.md,
                    borderBottom: `1px solid ${tokens.color.borderSubtle}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: tokens.space.md,
                  }}
                >
                  <input
                    type="range"
                    min={0}
                    max={Math.max(0, playbackDuration)}
                    step={0.05}
                    value={Math.min(playbackTime, playbackDuration)}
                    onChange={(e) => void handleSeek(parseFloat(e.target.value))}
                    style={{ flex: 1 }}
                  />
                  <div style={{ fontSize: tokens.fontSize.xs, color: tokens.color.textSubtle, minWidth: 100, textAlign: 'right' }}>
                    {formatDuration(playbackTime)} / {formatDuration(playbackDuration)}
                  </div>
                </div>
              )}

              {playbackError && (
                <div
                  style={{
                    padding: `${tokens.space.sm}px ${tokens.space.lg}px`,
                    borderBottom: `1px solid ${tokens.color.borderSubtle}`,
                    color: tokens.color.danger,
                    fontSize: tokens.fontSize.xs,
                  }}
                >
                  Audio error: {playbackError}
                </div>
              )}

              {/* Content */}
              <div style={{ flex: 1, overflow: 'auto', padding: tokens.space.lg }}>
                <p style={{ fontSize: tokens.fontSize.md, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                  {selectedEntry.text}
                </p>
              </div>
            </>
          ) : (
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: tokens.color.textSubtle,
              }}
            >
              Select a transcript to view
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
