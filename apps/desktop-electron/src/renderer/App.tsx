/**
 * Taik Desktop - Main App Component
 */

import { useEffect, useState } from 'react';
import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import {
  configureStorageAdapter,
  initializeStores,
  cleanupStores,
  getSonioxApiKey,
  useSettingsStore,
} from '@taik/domain';
import { ElectronStorageAdapter } from './adapters/ElectronStorageAdapter';
import { RecordScreen } from './screens/RecordScreen';
import { FilesScreen } from './screens/FilesScreen';
import { DeckScreen } from './screens/DeckScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { LogsScreen } from './screens/LogsScreen';
import { FloatingDeckPanel } from './components/FloatingDeckPanel';
import { VoiceScreen } from './screens/VoiceScreen';
import { useAppGlobalHotkeys } from './hooks';

// Navigation items
const NAV_ITEMS = [
  { path: '/', label: 'Record', icon: '🎙' },
  { path: '/files', label: 'Files', icon: '📁' },
  { path: '/deck', label: 'Deck', icon: '⊞' },
  { path: '/settings', label: 'Settings', icon: '⚙' },
  { path: '/logs', label: 'Logs', icon: '🪵' },
];

export function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const location = useLocation();

  // Check if we're rendering a floating panel
  const isFloatingDeck = location.pathname === '/deck-panel';
  const isFloatingVoice = location.pathname === '/voice-panel';
  const isFloatingWindow = isFloatingDeck || isFloatingVoice;

  // Register global hotkeys (only in main window, not floating windows)
  useAppGlobalHotkeys({ enabled: !isFloatingWindow && isInitialized });

  useEffect(() => {
    async function initialize() {
      try {
        // Configure storage adapter for Electron
        const storageAdapter = new ElectronStorageAdapter();
        configureStorageAdapter(storageAdapter);

        // Initialize all domain stores
        initializeStores();

        // Dev-only: seed Soniox API key from env if settings are empty.
        if (import.meta.env.DEV) {
          const envKey =
            import.meta.env.VITE_SONIOX_API_KEY ??
            (import.meta.env as { SONIOX_API_KEY?: string }).SONIOX_API_KEY ??
            '';
          const trimmedKey = envKey.trim();
          if (trimmedKey) {
            const store = useSettingsStore.getState();
            await store.loadSettings();
            const currentKey = getSonioxApiKey(store.engineSettings).trim();
            if (!currentKey) {
              await store.setSonioxApiKey(trimmedKey);
            }
          }
        }

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
          <Route path="/files" element={<FilesScreen />} />
          <Route path="/deck" element={<DeckScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
          <Route path="/logs" element={<LogsScreen />} />
        </Routes>
      </main>
    </div>
  );
}
