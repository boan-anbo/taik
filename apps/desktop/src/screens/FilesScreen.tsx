/**
 * History Screen
 * Transcript history and file management with file upload for async transcription
 */

import { useCallback, useEffect, useState, useRef } from 'react';
import {
  getSonioxApiKey,
  getActiveSonioxModel,
  useTranscriptStore,
  useSettingsStore,
  getActiveTranscriptVersion,
  SONIOX_DEFAULT_MODELS,
} from '@taik/domain';
import { tokens } from '@taik/ui-tokens';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { open, save } from '@tauri-apps/plugin-dialog';
import { readFile, writeFile } from '@tauri-apps/plugin-fs';
import {
  AsyncFileSession,
  type AsyncTranscriptionProgress,
} from '@taik/speech-engine';
import type { PlaybackState } from '@taik/capabilities';
import { TauriAudioAdapter } from '../adapters/TauriAudioAdapter';

export function HistoryScreen() {
  const { entries, selectedId, selectEntry, deleteEntry, addEntry, addVersion, setActiveVersion, isLoading, loadEntries } =
    useTranscriptStore();
  const { engineSettings } = useSettingsStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'live' | 'file'>('all');
  const [audioFilter, setAudioFilter] = useState<'all' | 'with-audio' | 'without-audio'>('all');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<AsyncTranscriptionProgress | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isRetranscribing, setIsRetranscribing] = useState(false);
  const [retranscribeProgress, setRetranscribeProgress] = useState<AsyncTranscriptionProgress | null>(null);
  const [retranscribeError, setRetranscribeError] = useState<string | null>(null);
  const [retranscribeModel, setRetranscribeModel] = useState('');
  const [retranscribeCustomModel, setRetranscribeCustomModel] = useState('');
  const sessionRef = useRef<AsyncFileSession | null>(null);
  const retranscribeSessionRef = useRef<AsyncFileSession | null>(null);

  // Playback (for history entries with saved audio)
  const audioAdapterRef = useRef(new TauriAudioAdapter());
  const [playbackState, setPlaybackState] = useState<PlaybackState>('idle');
  const [playbackTime, setPlaybackTime] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(0);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [hasSelectedAudioFile, setHasSelectedAudioFile] = useState(false);
  const [pendingDeleteEntryId, setPendingDeleteEntryId] = useState<string | null>(null);

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
  const selectedAudioUri = selectedEntry?.metadata?.audioUri;
  const activeVersion = selectedEntry ? getActiveTranscriptVersion(selectedEntry) : null;

  useEffect(() => {
    void loadEntries();
    const onFocus = () => {
      void loadEntries();
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void loadEntries();
      }
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [loadEntries]);

  useEffect(() => {
    const fallbackModel = engineSettings.soniox?.asyncModel ?? SONIOX_DEFAULT_MODELS.async;
    setRetranscribeModel(fallbackModel);
  }, [engineSettings.soniox?.asyncModel]);

  useEffect(() => {
    setRetranscribeError(null);
    setRetranscribeProgress(null);
    setIsRetranscribing(false);
    setPendingDeleteEntryId(null);
    if (retranscribeSessionRef.current) {
      retranscribeSessionRef.current.abort();
      retranscribeSessionRef.current = null;
    }
  }, [selectedEntry?.id]);

  // Load selected entry audio (if available)
  useEffect(() => {
    let cancelled = false;
    const adapter = audioAdapterRef.current;

    setPlaybackError(null);
    setPlaybackTime(0);
    setPlaybackDuration(0);
    setHasSelectedAudioFile(false);
    setIsAudioLoading(false);

    const audioUri = selectedAudioUri;
    if (!audioUri) {
      // Best effort stop
      adapter.stop().catch(() => {});
      return;
    }

    setIsAudioLoading(true);
    adapter
      .fileExists(audioUri)
      .then((fileExists) => {
        if (cancelled) return;
        if (!fileExists) {
          setHasSelectedAudioFile(false);
          setPlaybackError('Audio file not found');
          setIsAudioLoading(false);
          return;
        }
        setHasSelectedAudioFile(true);
        return adapter
          .loadAudio(audioUri)
          .then(() => {
            if (!cancelled) {
              setPlaybackDuration(adapter.getDuration());
              setPlaybackError(null);
            }
          })
          .catch((err) => {
            if (!cancelled) {
              const message = err instanceof Error ? err.message : 'Failed to load audio';
              setPlaybackError(message);
              setHasSelectedAudioFile(false);
            }
          })
          .finally(() => {
            if (!cancelled) {
              setIsAudioLoading(false);
            }
          });
      })
      .catch(() => {
        if (!cancelled) {
          setPlaybackError('Failed to check audio file');
          setHasSelectedAudioFile(false);
          setIsAudioLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedEntry?.id, selectedAudioUri]);

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

  const getAudioFormatFromFileName = (name: string): string => {
    const ext = name.split('.').pop()?.toLowerCase();
    if (!ext) return 'webm';
    const supported = new Set(['webm', 'wav', 'mp3', 'flac', 'm4a', 'ogg', 'mp4', 'aac']);
    return supported.has(ext) ? ext : 'webm';
  };

  const handleCopy = useCallback(async () => {
    if (selectedEntry) {
      const text = activeVersion?.text ?? selectedEntry.text;
      await writeText(text);
    }
  }, [selectedEntry, activeVersion]);

  const handleCopyAudioPath = useCallback(async () => {
    const audioUri = selectedAudioUri;
    if (!audioUri) return;
    await writeText(audioUri);
  }, [selectedAudioUri]);

  const handleExportAudio = useCallback(async () => {
    const audioUri = selectedAudioUri;
    if (!audioUri) return;

    const fileName = audioUri.split('/').pop() ?? `taik-recording-${selectedEntry?.id}.webm`;
    const ext = fileName.includes('.') ? fileName.split('.').pop()!.toLowerCase() : 'webm';

    const path = await save({
      defaultPath: fileName,
      filters: [{ name: 'Audio', extensions: [ext] }],
    });
    if (!path) return;

    try {
      const data = await readFile(audioUri);
      await writeFile(path, data);
    } catch (err) {
      setPlaybackError(err instanceof Error ? err.message : 'Failed to export audio');
    }
  }, [selectedEntry?.id, selectedAudioUri]);

  const handleDelete = useCallback(async () => {
    if (!selectedEntry) return;
    if (pendingDeleteEntryId !== selectedEntry.id) {
      setPendingDeleteEntryId(selectedEntry.id);
      return;
    }
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
    setPendingDeleteEntryId(null);
  }, [selectedEntry, deleteEntry, pendingDeleteEntryId]);

  const handleExportAll = useCallback(async () => {
    const path = await save({
      defaultPath: `taik-history-${new Date().toISOString().replace(/[:.]/g, '-')}.json`,
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });
    if (!path) return;

    const payload = {
      exportedAt: new Date().toISOString(),
      count: filteredEntries.length,
      entries: filteredEntries,
    };
    await writeFile(path, new TextEncoder().encode(JSON.stringify(payload, null, 2)));
  }, [filteredEntries]);

  const handleExportSelected = useCallback(async () => {
    if (!selectedEntry) return;
    const path = await save({
      defaultPath: `taik-transcript-${selectedEntry.id}.json`,
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });
    if (!path) return;

    const payload = {
      exportedAt: new Date().toISOString(),
      entry: selectedEntry,
    };
    await writeFile(path, new TextEncoder().encode(JSON.stringify(payload, null, 2)));
  }, [selectedEntry]);

  const handlePlayPause = useCallback(async () => {
    const adapter = audioAdapterRef.current;
    if (!adapter) return;
    if (!selectedAudioUri) return;

    try {
      if (playbackState === 'playing') {
        await adapter.pause();
      } else {
        await adapter.play();
      }
    } catch (err) {
      setPlaybackError(err instanceof Error ? err.message : 'Playback failed');
    }
  }, [playbackState, selectedAudioUri]);

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

    const asyncModel = engineSettings.soniox
      ? getActiveSonioxModel({ ...engineSettings.soniox, mode: 'async' })
      : SONIOX_DEFAULT_MODELS.async;

    // Open file dialog
    const selected = await open({
      title: 'Select Audio File',
      filters: [
        {
          name: 'Audio Files',
          extensions: ['mp3', 'wav', 'flac', 'm4a', 'ogg', 'webm', 'mp4'],
        },
      ],
      multiple: false,
    });

    if (!selected) return;

    // Handle both string and object return types
    const filePath = typeof selected === 'string' ? selected : (selected as { path: string }).path;
    const fileName = filePath.split('/').pop() || 'uploaded-file';

    setIsUploading(true);
    setUploadProgress(null);
    setUploadError(null);

    try {
      // Read the file
      const fileData = await readFile(filePath);
      const fileBuffer = fileData.buffer.slice(
        fileData.byteOffset,
        fileData.byteOffset + fileData.byteLength
      );

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
        let audioUri: string | undefined;

        try {
          audioUri = await audioAdapterRef.current.saveRecordedAudio(fileBuffer, {
            duration: durationSeconds,
            timestamp: Date.now(),
            format: getAudioFormatFromFileName(fileName),
          });
        } catch (err) {
          console.error('[HistoryScreen] Failed to save uploaded audio into app directory:', err);
        }

        // Add to transcript store
        await addEntry(result.text, 'file', durationSeconds, {
          fileName,
          engine: 'soniox',
          model: asyncModel,
          language: engineSettings.languageHints[0],
          audioUri,
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
      await session.transcribeFile(fileBuffer, fileName, {
        model: asyncModel,
        languageHints: engineSettings.languageHints,
      });
    } catch (error) {
      console.error('[HistoryScreen] Upload error:', error);
      console.error('[HistoryScreen] Error type:', typeof error);
      console.error('[HistoryScreen] Error constructor:', error?.constructor?.name);
      if (error instanceof Error) {
        console.error('[HistoryScreen] Error message:', error.message);
        console.error('[HistoryScreen] Error stack:', error.stack);
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

  const handleRetranscribe = useCallback(async () => {
    if (!selectedEntry?.metadata?.audioUri) return;

    const apiKey = getSonioxApiKey(engineSettings);
    if (!apiKey) {
      setRetranscribeError('Please configure your Soniox API key in Settings first.');
      return;
    }

    const audioUri = selectedEntry.metadata.audioUri;
    const model =
      retranscribeCustomModel.trim() ||
      retranscribeModel ||
      engineSettings.soniox?.asyncModel ||
      SONIOX_DEFAULT_MODELS.async;

    setIsRetranscribing(true);
    setRetranscribeProgress(null);
    setRetranscribeError(null);

    try {
      const audioData = await audioAdapterRef.current.readAudioFile(audioUri);

      const session = new AsyncFileSession({ apiKey });
      retranscribeSessionRef.current = session;

      session.on('progress', (progress: AsyncTranscriptionProgress) => {
        setRetranscribeProgress(progress);
      });

      session.on('complete', async (result) => {
        await addVersion(selectedEntry.id, {
          text: result.text,
          source: 'retranscribe',
          engine: 'soniox',
          model,
          language: engineSettings.languageHints[0],
          tokens: result.tokens,
        });

        setIsRetranscribing(false);
        setRetranscribeProgress(null);
        retranscribeSessionRef.current = null;
      });

      session.on('error', ({ error }) => {
        setRetranscribeError(error.message || 'Retranscription failed');
        setIsRetranscribing(false);
        setRetranscribeProgress(null);
        retranscribeSessionRef.current = null;
      });

      await session.transcribeFile(audioData, audioUri.split('/').pop() || 'recording.webm', {
        model,
        languageHints: engineSettings.languageHints,
      });
    } catch (error) {
      setRetranscribeError(error instanceof Error ? error.message : 'Failed to retranscribe');
      setIsRetranscribing(false);
      setRetranscribeProgress(null);
      retranscribeSessionRef.current = null;
    }
  }, [
    selectedEntry,
    engineSettings,
    retranscribeCustomModel,
    retranscribeModel,
    addVersion,
  ]);

  const handleCancelRetranscribe = useCallback(() => {
    if (retranscribeSessionRef.current) {
      retranscribeSessionRef.current.abort();
      retranscribeSessionRef.current = null;
    }
    setIsRetranscribing(false);
    setRetranscribeProgress(null);
  }, []);

  return (
    <div className="screen" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="screen-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="screen-title">History</h1>
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
                <option value="file">Uploads</option>
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
                  {(activeVersion?.engine || activeVersion?.model || selectedEntry.metadata?.engine) && (
                    <div style={{ fontSize: tokens.fontSize.xs, color: tokens.color.textSubtle, marginTop: 4 }}>
                      Engine: {activeVersion?.engine ?? selectedEntry.metadata?.engine ?? 'unknown'}
                      {activeVersion?.model ? ` · Model: ${activeVersion.model}` : ''}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: tokens.space.sm }}>
                  <button
                    onClick={handlePlayPause}
                    disabled={!selectedAudioUri || isAudioLoading || !hasSelectedAudioFile}
                    style={{
                      padding: `${tokens.space.sm}px ${tokens.space.md}px`,
                      backgroundColor: tokens.color.surface,
                      color:
                        selectedAudioUri && hasSelectedAudioFile && !isAudioLoading
                          ? tokens.color.text
                          : tokens.color.textSubtle,
                      border: `1px solid ${tokens.color.borderSubtle}`,
                      borderRadius: tokens.radius.sm,
                      fontSize: tokens.fontSize.sm,
                      cursor:
                        selectedAudioUri && hasSelectedAudioFile && !isAudioLoading
                          ? 'pointer'
                          : 'not-allowed',
                      opacity: selectedAudioUri && hasSelectedAudioFile && !isAudioLoading ? 1 : 0.7,
                    }}
                    title={
                      !selectedAudioUri
                        ? 'No audio attached to this entry'
                        : isAudioLoading
                          ? 'Loading audio...'
                          : hasSelectedAudioFile
                            ? 'Play this recording'
                            : 'Audio file missing or unreadable'
                    }
                  >
                    {isAudioLoading ? 'Loading...' : playbackState === 'playing' ? 'Pause' : 'Play'}
                  </button>
                  {selectedAudioUri && (
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
                  {selectedAudioUri && (
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
                      backgroundColor:
                        pendingDeleteEntryId === selectedEntry.id
                          ? tokens.color.danger
                          : tokens.color.surface,
                      color:
                        pendingDeleteEntryId === selectedEntry.id
                          ? 'white'
                          : tokens.color.danger,
                      border:
                        pendingDeleteEntryId === selectedEntry.id
                          ? 'none'
                          : `1px solid ${tokens.color.danger}`,
                      borderRadius: tokens.radius.sm,
                      fontSize: tokens.fontSize.sm,
                      cursor: 'pointer',
                    }}
                  >
                    {pendingDeleteEntryId === selectedEntry.id ? 'Confirm delete' : 'Delete'}
                  </button>
                </div>
              </div>

              {/* Audio Playback */}
              {selectedAudioUri && (
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

              {/* Versions */}
              {selectedEntry.versions && selectedEntry.versions.length > 1 && (
                <div
                  style={{
                    padding: tokens.space.md,
                    borderBottom: `1px solid ${tokens.color.borderSubtle}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: tokens.space.sm,
                  }}
                >
                  <div style={{ fontSize: tokens.fontSize.xs, color: tokens.color.textSubtle }}>
                    Versions
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: tokens.space.sm }}>
                    {selectedEntry.versions.map((version) => {
                      const isActive = selectedEntry.activeVersionId === version.id;
                      return (
                        <button
                          key={version.id}
                          onClick={() => void setActiveVersion(selectedEntry.id, version.id)}
                          style={{
                            padding: `${tokens.space.xs}px ${tokens.space.sm}px`,
                            borderRadius: tokens.radius.sm,
                            border: `1px solid ${isActive ? tokens.color.brand : tokens.color.borderSubtle}`,
                            backgroundColor: isActive ? tokens.color.brand : 'transparent',
                            color: isActive ? 'white' : tokens.color.text,
                            fontSize: tokens.fontSize.xs,
                            cursor: 'pointer',
                          }}
                          title={`${version.engine ?? 'engine'} · ${version.model ?? 'default'}`}
                        >
                          {version.source === 'original' ? 'Original' : 'Re-transcribe'}
                          {version.model ? ` · ${version.model}` : ''}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Re-transcribe */}
              {selectedEntry.metadata?.audioUri && (
                <div
                  style={{
                    padding: tokens.space.md,
                    borderBottom: `1px solid ${tokens.color.borderSubtle}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: tokens.space.sm,
                  }}
                >
                  <div style={{ fontSize: tokens.fontSize.xs, color: tokens.color.textSubtle }}>
                    Re-transcribe audio (creates a new version)
                  </div>
                  <div style={{ display: 'flex', gap: tokens.space.sm, flexWrap: 'wrap' }}>
                    <select
                      value={retranscribeModel}
                      onChange={(e) => setRetranscribeModel(e.target.value)}
                      style={{
                        minWidth: 160,
                        padding: tokens.space.xs,
                        borderRadius: tokens.radius.sm,
                        border: `1px solid ${tokens.color.borderSubtle}`,
                        fontSize: tokens.fontSize.xs,
                      }}
                    >
                      <option value={SONIOX_DEFAULT_MODELS.async}>Soniox async (default)</option>
                      {engineSettings.soniox?.asyncModel &&
                        engineSettings.soniox.asyncModel !== SONIOX_DEFAULT_MODELS.async && (
                          <option value={engineSettings.soniox.asyncModel}>
                            Soniox async (settings)
                          </option>
                        )}
                    </select>
                    <input
                      type="text"
                      placeholder="Custom model (optional)"
                      value={retranscribeCustomModel}
                      onChange={(e) => setRetranscribeCustomModel(e.target.value)}
                      style={{
                        flex: '1 1 200px',
                        padding: tokens.space.xs,
                        borderRadius: tokens.radius.sm,
                        border: `1px solid ${tokens.color.borderSubtle}`,
                        fontSize: tokens.fontSize.xs,
                      }}
                    />
                    <button
                      onClick={() => void handleRetranscribe()}
                      disabled={isRetranscribing}
                      style={{
                        padding: `${tokens.space.xs}px ${tokens.space.md}px`,
                        backgroundColor: isRetranscribing ? tokens.color.systemGray4 : tokens.color.brand,
                        color: isRetranscribing ? tokens.color.textSubtle : 'white',
                        border: 'none',
                        borderRadius: tokens.radius.sm,
                        fontSize: tokens.fontSize.xs,
                        cursor: isRetranscribing ? 'wait' : 'pointer',
                      }}
                    >
                      {isRetranscribing ? 'Transcribing...' : 'Re-transcribe'}
                    </button>
                    {isRetranscribing && (
                      <button
                        onClick={handleCancelRetranscribe}
                        style={{
                          padding: `${tokens.space.xs}px ${tokens.space.md}px`,
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
                    )}
                  </div>
                  {retranscribeProgress && (
                    <div style={{ fontSize: tokens.fontSize.xs, color: tokens.color.textSubtle }}>
                      {retranscribeProgress.status}: {Math.round(retranscribeProgress.progress)}%
                    </div>
                  )}
                  {retranscribeError && (
                    <div style={{ fontSize: tokens.fontSize.xs, color: tokens.color.danger }}>
                      {retranscribeError}
                    </div>
                  )}
                </div>
              )}

              {/* Content */}
              <div style={{ flex: 1, overflow: 'auto', padding: tokens.space.lg }}>
                <p style={{ fontSize: tokens.fontSize.md, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                  {activeVersion?.text ?? selectedEntry.text}
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
