/**
 * Taik Desktop - Main App Component
 */

import { useEffect, useState } from 'react';
import { Routes, Route, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import {
  configureStorageAdapter,
  initializeStores,
  cleanupStores,
  useSettingsStore,
  getSonioxApiKey,
} from '@taik/domain';
import { TauriStorageAdapter } from './adapters/TauriStorageAdapter';
import { RecordScreen } from './screens/RecordScreen';
import { HistoryScreen } from './screens/FilesScreen';
import { DeckScreen } from './screens/DeckScreen';
import { AppSettingsScreen } from './screens/AppSettingsScreen';
import { VoiceDictationSettingsScreen } from './screens/VoiceDictationSettingsScreen';
import { LogsScreen } from './screens/LogsScreen';
import { FloatingDeckPanel } from './components/FloatingDeckPanel';
import { VoiceScreen } from './screens/VoiceScreen';
import { VoiceMeterScreen } from './screens/VoiceMeterScreen';
import { useAppGlobalHotkeys } from './hooks';
import { safeUnlisten } from './utils/safeUnlisten';

// Navigation items
const NAV_ITEMS = [
  { path: '/', label: 'Record', icon: '🎙' },
  { path: '/history', label: 'History', icon: '🗂' },
  { path: '/deck', label: 'Deck', icon: '⊞' },
  { path: '/voice-dictation', label: 'Voice Dictation', icon: '🎧' },
  { path: '/app-settings', label: 'App Settings', icon: '⚙' },
  { path: '/logs', label: 'Logs', icon: '🪵' },
];

export function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Check if we're rendering a floating panel
  const isFloatingDeck = location.pathname === '/deck-panel';
  const isFloatingVoice = location.pathname === '/voice-panel';
  const isFloatingMeter = location.pathname === '/voice-meter';
  const isFloatingWindow = isFloatingDeck || isFloatingVoice || isFloatingMeter;

  // Register global hotkeys (only in main window, not floating windows)
  useAppGlobalHotkeys({ enabled: !isFloatingWindow && isInitialized });

  // Window-level transparency is handled via native Tauri config.

  // Allow other windows (e.g. voice panel) to request navigation in the main window.
  useEffect(() => {
    if (isFloatingWindow) return;

    let unlisten: UnlistenFn | undefined;
    const setup = async () => {
      unlisten = await listen('taik:navigate', (event) => {
        const payload = event.payload as { path?: unknown } | null | undefined;
        const path = payload?.path;
        if (typeof path === 'string' && path.startsWith('/')) {
          navigate(path);
        }
      });
    };

    setup();
    return () => safeUnlisten(unlisten);
  }, [isFloatingWindow, navigate]);

  useEffect(() => {
    async function maybeSeedDevApiKey() {
      try {
        const settingsStore = useSettingsStore.getState();
        await settingsStore.loadSettings();

        const currentKey = getSonioxApiKey(settingsStore.engineSettings).trim();
        if (currentKey) {
          return;
        }

        const viteKey = (import.meta.env.VITE_SONIOX_API_KEY ?? '').trim();
        if (viteKey) {
          await settingsStore.setSonioxApiKey(viteKey);
          console.log('[dev] Seeded Soniox API key from VITE_SONIOX_API_KEY');
          return;
        }

        const keys = ['TAIK_SONIOX_API_KEY', 'SONIOX_API_KEY', 'VITE_SONIOX_API_KEY'];
        for (const key of keys) {
          const value = await invoke<string | null>('read_dev_env', { key });
          if (value && value.trim()) {
            await settingsStore.setSonioxApiKey(value.trim());
            console.log(`[dev] Seeded Soniox API key from ${key}`);
            break;
          }
        }
      } catch (err) {
        console.warn('[dev] Unable to seed Soniox API key:', err);
      }
    }

    async function initialize() {
      try {
        // Configure storage adapter for Tauri
        const storageAdapter = new TauriStorageAdapter();
        configureStorageAdapter(storageAdapter);

        // Initialize all domain stores
        initializeStores();

        await maybeSeedDevApiKey();

        setIsInitialized(true);
      } catch (err) {
        console.error('Failed to initialize app:', err);
        setInitError(
          err instanceof Error ? err.message : 'Failed to initialize'
        );
      }
    }

    initialize();

    return () => {
      cleanupStores();
    };
  }, []);

  if (initError) {
    return (
      <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ textAlign: 'center', padding: 40 }}>
          <h1 style={{ color: 'var(--color-danger)', marginBottom: 16 }}>
            Initialization Error
          </h1>
          <p style={{ color: 'var(--color-text-subtle)' }}>{initError}</p>
        </div>
      </div>
    );
  }

  if (!isInitialized) {
    // Minimal loading for floating windows
    if (isFloatingWindow) {
      return <div style={{ background: 'transparent' }} />;
    }
    return (
      <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ textAlign: 'center', padding: 40 }}>
          <p style={{ color: 'var(--color-text-subtle)' }}>Loading...</p>
        </div>
      </div>
    );
  }

  // Floating panels - separate windows without sidebar
  if (isFloatingWindow) {
    return (
      <Routes>
        <Route path="/deck-panel" element={<FloatingDeckPanel />} />
        <Route path="/voice-panel" element={<VoiceScreen />} />
        <Route path="/voice-meter" element={<VoiceMeterScreen />} />
      </Routes>
    );
  }

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <nav className="sidebar">
        <div className="sidebar-header">Taik</div>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `nav-item ${isActive ? 'active' : ''}`
            }
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
          <Route path="/history" element={<HistoryScreen />} />
          <Route path="/deck" element={<DeckScreen />} />
          <Route path="/voice-dictation" element={<VoiceDictationSettingsScreen />} />
          <Route path="/app-settings" element={<AppSettingsScreen />} />
          <Route path="/logs" element={<LogsScreen />} />
        </Routes>
      </main>
    </div>
  );
}
