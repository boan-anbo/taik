/**
 * Full Taik App Story
 *
 * This story renders the complete Taik application with browser-compatible
 * adapters replacing Tauri-specific APIs.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { MemoryRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import {
  configureStorageAdapter,
  initializeStores,
  cleanupStores,
  useSettingsStore,
  useTranscriptStore,
} from '@taik/domain';
import { tokens } from '@taik/ui-tokens';
import { TranscriptDisplay } from '@taik/ui-dom';
import {
  AsyncFileSession,
  type AsyncTranscriptionProgress,
} from '@taik/speech-engine';
import type {
  IStorageAdapter,
  StorageChangeCallback,
  Unsubscribe,
} from '@taik/capabilities';
import './taik-app.css';

// ============================================================================
// Browser Storage Adapter (replaces TauriStorageAdapter)
// ============================================================================

// Storybook testing API key from environment
const STORYBOOK_SONIOX_API_KEY = import.meta.env.VITE_SONIOX_API_KEY || '';

class BrowserStorageAdapter implements IStorageAdapter {
  private prefix = 'taik-storybook:';
  private listeners: Map<string, Set<StorageChangeCallback<unknown>>> = new Map();

  async get<T>(key: string): Promise<T | null> {
    const value = localStorage.getItem(this.prefix + key);
    if (value === null) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    const oldValue = await this.get<T>(key);
    localStorage.setItem(this.prefix + key, JSON.stringify(value));
    this.notifyListeners(key, value, oldValue);
  }

  async delete(key: string): Promise<void> {
    const oldValue = await this.get(key);
    localStorage.removeItem(this.prefix + key);
    this.notifyListeners(key, null, oldValue);
  }

  async has(key: string): Promise<boolean> {
    return localStorage.getItem(this.prefix + key) !== null;
  }

  async keys(): Promise<string[]> {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.prefix)) {
        keys.push(key.slice(this.prefix.length));
      }
    }
    return keys;
  }

  async clear(): Promise<void> {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.prefix)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  }

  subscribe<T>(key: string, callback: StorageChangeCallback<T>): Unsubscribe {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key)!.add(callback as StorageChangeCallback<unknown>);
    return () => {
      const callbacks = this.listeners.get(key);
      if (callbacks) {
        callbacks.delete(callback as StorageChangeCallback<unknown>);
      }
    };
  }

  async getMultiple<T>(keys: string[]): Promise<Map<string, T | null>> {
    const result = new Map<string, T | null>();
    for (const key of keys) {
      result.set(key, await this.get<T>(key));
    }
    return result;
  }

  async setMultiple<T>(entries: Map<string, T>): Promise<void> {
    for (const [key, value] of entries) {
      await this.set(key, value);
    }
  }

  private notifyListeners<T>(key: string, newValue: T | null, oldValue: T | null): void {
    const callbacks = this.listeners.get(key);
    if (callbacks) {
      callbacks.forEach((cb) => (cb as StorageChangeCallback<T>)(newValue, oldValue));
    }
  }
}

// ============================================================================
// Navigation
// ============================================================================

const NAV_ITEMS = [
  { path: '/', label: 'Record', icon: '🎙' },
  { path: '/files', label: 'Files', icon: '📁' },
  { path: '/settings', label: 'Settings', icon: '⚙' },
];

// ============================================================================
// Record Screen (Browser version)
// ============================================================================

function RecordScreen() {
  const { engineSettings } = useSettingsStore();

  return (
    <div className="screen" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="screen-header">
        <h1 className="screen-title">Record</h1>
      </div>

      <div
        style={{
          flex: 1,
          backgroundColor: tokens.color.surface,
          borderRadius: tokens.radius.md,
          padding: tokens.space.xl,
          marginBottom: tokens.space.xl,
          overflow: 'auto',
        }}
      >
        <p style={{ color: tokens.color.textSubtle }}>
          {engineSettings.sonioxApiKey
            ? 'Real-time recording is available in the desktop app. This Storybook demo focuses on file upload testing.'
            : 'Please configure your Soniox API key in Settings to enable transcription.'}
        </p>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: tokens.space.lg,
          paddingBottom: tokens.space.xl,
        }}
      >
        <p style={{ color: tokens.color.textSubtle, fontSize: tokens.fontSize.md }}>
          Click to start recording (simulated)
        </p>

        <button
          disabled
          style={{
            width: 100,
            height: 100,
            borderRadius: '50%',
            border: 'none',
            backgroundColor: tokens.color.brand,
            color: 'white',
            fontSize: 32,
            cursor: 'not-allowed',
            opacity: 0.5,
          }}
        >
          🎙
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Files Screen (Browser version with File System API)
// ============================================================================

function FilesScreen() {
  const { entries, selectedId, selectEntry, deleteEntry, addEntry, isLoading } =
    useTranscriptStore();
  const { engineSettings } = useSettingsStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<AsyncTranscriptionProgress | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const sessionRef = useRef<AsyncFileSession | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredEntries = searchQuery
    ? entries.filter(
        (entry) =>
          entry.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
          entry.metadata?.fileName?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : entries;

  const selectedEntry = entries.find((e) => e.id === selectedId);

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
      await navigator.clipboard.writeText(selectedEntry.text);
    }
  }, [selectedEntry]);

  const handleDelete = useCallback(async () => {
    if (selectedEntry && confirm('Delete this transcript?')) {
      await deleteEntry(selectedEntry.id);
    }
  }, [selectedEntry, deleteEntry]);

  // File upload using browser File API
  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Check API key
      if (!engineSettings.sonioxApiKey) {
        setUploadError('Please configure your Soniox API key in Settings first.');
        return;
      }

      setIsUploading(true);
      setUploadProgress(null);
      setUploadError(null);

      try {
        // Read the file as ArrayBuffer
        const fileData = await file.arrayBuffer();
        const fileName = file.name;

        // Create async session
        const session = new AsyncFileSession({
          apiKey: engineSettings.sonioxApiKey,
        });

        sessionRef.current = session;

        // Handle progress updates
        session.on('progress', (progress: AsyncTranscriptionProgress) => {
          setUploadProgress(progress);
        });

        // Handle completion
        session.on('complete', async (result) => {
          const durationSeconds = result.audioDurationMs ? result.audioDurationMs / 1000 : 1;

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

        // Start transcription
        await session.transcribeFile(fileData, fileName, {
          languageHints: engineSettings.languageHints,
        });
      } catch (error) {
        setUploadError(error instanceof Error ? error.message : 'Failed to process file');
        setIsUploading(false);
        setUploadProgress(null);
      }
    },
    [engineSettings, addEntry]
  );

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

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
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".mp3,.wav,.flac,.m4a,.ogg,.webm,.mp4,.aac"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />

      <div
        className="screen-header"
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <h1 className="screen-title">Files</h1>
        <button
          onClick={handleUploadClick}
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
              {uploadProgress.status === 'queued' && `Uploading: ${uploadProgress.progress}%`}
              {uploadProgress.status === 'processing' &&
                `Transcribing: ${uploadProgress.progress}%`}
              {uploadProgress.status === 'completed' && `Completed!`}
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
          </div>

          <div style={{ flex: 1, overflow: 'auto' }}>
            {isLoading ? (
              <p
                style={{
                  padding: tokens.space.lg,
                  textAlign: 'center',
                  color: tokens.color.textSubtle,
                }}
              >
                Loading...
              </p>
            ) : filteredEntries.length === 0 ? (
              <p
                style={{
                  padding: tokens.space.lg,
                  textAlign: 'center',
                  color: tokens.color.textSubtle,
                }}
              >
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
                    backgroundColor: selectedId === entry.id ? tokens.color.brand : 'transparent',
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
                      color: selectedId === entry.id ? 'rgba(255,255,255,0.8)' : tokens.color.textSubtle,
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
                    <div
                      style={{
                        fontSize: tokens.fontSize.xs,
                        color: tokens.color.textSubtle,
                        marginTop: 4,
                      }}
                    >
                      Engine: {selectedEntry.metadata.engine}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: tokens.space.sm }}>
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

// ============================================================================
// Settings Screen (Browser version)
// ============================================================================

function SettingsScreen() {
  const { engineSettings, updateEngineSettings } = useSettingsStore();
  const [apiKey, setApiKey] = useState(engineSettings.sonioxApiKey);
  const [languageHints, setLanguageHints] = useState(engineSettings.languageHints.join(', '));

  const handleSave = () => {
    updateEngineSettings({
      sonioxApiKey: apiKey,
      languageHints: languageHints
        .split(',')
        .map((l) => l.trim())
        .filter(Boolean),
    });
  };

  return (
    <div className="screen">
      <div className="screen-header">
        <h1 className="screen-title">Settings</h1>
      </div>

      <div
        style={{
          backgroundColor: tokens.color.surface,
          borderRadius: tokens.radius.md,
          padding: tokens.space.xl,
        }}
      >
        <div style={{ marginBottom: tokens.space.xl }}>
          <label
            style={{
              display: 'block',
              fontSize: tokens.fontSize.sm,
              fontWeight: tokens.fontWeight.medium,
              marginBottom: tokens.space.sm,
            }}
          >
            Soniox API Key
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter your Soniox API key"
            style={{
              width: '100%',
              padding: tokens.space.md,
              borderRadius: tokens.radius.sm,
              border: `1px solid ${tokens.color.borderSubtle}`,
              fontSize: tokens.fontSize.md,
            }}
          />
          <p
            style={{
              marginTop: tokens.space.sm,
              fontSize: tokens.fontSize.xs,
              color: tokens.color.textSubtle,
            }}
          >
            Get your API key from{' '}
            <a
              href="https://soniox.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: tokens.color.brand }}
            >
              soniox.com
            </a>
          </p>
        </div>

        <div style={{ marginBottom: tokens.space.xl }}>
          <label
            style={{
              display: 'block',
              fontSize: tokens.fontSize.sm,
              fontWeight: tokens.fontWeight.medium,
              marginBottom: tokens.space.sm,
            }}
          >
            Language Hints
          </label>
          <input
            type="text"
            value={languageHints}
            onChange={(e) => setLanguageHints(e.target.value)}
            placeholder="en, zh, es"
            style={{
              width: '100%',
              padding: tokens.space.md,
              borderRadius: tokens.radius.sm,
              border: `1px solid ${tokens.color.borderSubtle}`,
              fontSize: tokens.fontSize.md,
            }}
          />
          <p
            style={{
              marginTop: tokens.space.sm,
              fontSize: tokens.fontSize.xs,
              color: tokens.color.textSubtle,
            }}
          >
            Comma-separated language codes (e.g., en, zh, es)
          </p>
        </div>

        <button
          onClick={handleSave}
          style={{
            backgroundColor: tokens.color.brand,
            color: 'white',
            padding: `${tokens.space.md}px ${tokens.space.xxl}px`,
            borderRadius: tokens.radius.md,
            border: 'none',
            fontSize: tokens.fontSize.md,
            fontWeight: tokens.fontWeight.semibold,
            cursor: 'pointer',
          }}
        >
          Save Settings
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Main App Component
// ============================================================================

function TaikApp() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    async function initialize() {
      try {
        // Configure browser storage adapter
        const storageAdapter = new BrowserStorageAdapter();
        configureStorageAdapter(storageAdapter);

        // Pre-populate settings with API key from env (always override for Storybook testing)
        if (STORYBOOK_SONIOX_API_KEY) {
          const existingSettings = await storageAdapter.get<Record<string, unknown>>('engine_settings') || {};
          await storageAdapter.set('engine_settings', {
            ...existingSettings,
            sonioxApiKey: STORYBOOK_SONIOX_API_KEY,
            languageHints: existingSettings.languageHints || ['en'],
            preferredEngine: existingSettings.preferredEngine || 'soniox',
          });
        }

        // Initialize stores
        initializeStores();
        setIsInitialized(true);
      } catch (err) {
        console.error('Failed to initialize app:', err);
        setInitError(err instanceof Error ? err.message : 'Failed to initialize');
      }
    }

    initialize();

    return () => {
      cleanupStores();
    };
  }, []);

  if (initError) {
    return (
      <div
        style={{
          display: 'flex',
          height: '100%',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <div style={{ textAlign: 'center', padding: 40 }}>
          <h1 style={{ color: tokens.color.danger, marginBottom: 16 }}>Initialization Error</h1>
          <p style={{ color: tokens.color.textSubtle }}>{initError}</p>
        </div>
      </div>
    );
  }

  if (!isInitialized) {
    return (
      <div
        style={{
          display: 'flex',
          height: '100%',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <p style={{ color: tokens.color.textSubtle }}>Loading...</p>
      </div>
    );
  }

  return <AppContent />;
}

function AppContent() {
  const location = useLocation();

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <nav className="sidebar">
        <div className="sidebar-header">Taik</div>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Main Content */}
      <main className="main-content">
        <Routes>
          <Route path="/" element={<RecordScreen />} />
          <Route path="/files" element={<FilesScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
        </Routes>
      </main>
    </div>
  );
}

// ============================================================================
// Storybook Meta & Stories
// ============================================================================

const meta: Meta<typeof TaikApp> = {
  title: 'App/TaikApp',
  component: TaikApp,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/files']}>
        <div style={{ height: '100vh', width: '100vw' }}>
          <Story />
        </div>
      </MemoryRouter>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  name: 'Full App (Files Screen)',
};

export const RecordPage: Story = {
  name: 'Full App (Record Screen)',
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/']}>
        <div style={{ height: '100vh', width: '100vw' }}>
          <Story />
        </div>
      </MemoryRouter>
    ),
  ],
};

export const SettingsPage: Story = {
  name: 'Full App (Settings Screen)',
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/settings']}>
        <div style={{ height: '100vh', width: '100vw' }}>
          <Story />
        </div>
      </MemoryRouter>
    ),
  ],
};
