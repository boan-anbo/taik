/**
 * Voice Recording Test Story
 * Isolated test for voice recording functionality
 * - Left side: Real record button with waveform visualization
 * - Right side: Text output area showing transcribed text
 */

import type { Meta, StoryObj } from '@storybook/react';
import React, { useState, useCallback, useEffect } from 'react';
import {
  useRecordingSession,
  useVoiceStore,
  configureStorageAdapter,
  type ITextInputAdapter,
  type ISystemAdapter,
} from '@taik/domain';
import { WaveformDisplay } from '@taik/ui-dom';
import type { IStorageAdapter } from '@taik/capabilities';
import { BrowserMediaDeviceAdapter } from '@taik/platform-web';

/**
 * In-memory storage adapter for Storybook
 */
class MemoryStorageAdapter implements IStorageAdapter {
  private store = new Map<string, string>();

  async getItem(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }

  async setItem(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    this.store.delete(key);
  }
}

// Configure storage adapter once
const storageAdapter = new MemoryStorageAdapter();
configureStorageAdapter(storageAdapter);

// Default test API key
const DEFAULT_SONIOX_API_KEY = '';

/**
 * Voice Recording Test Component
 */
function VoiceRecordingTest() {
  const [apiKey, setApiKey] = useState(DEFAULT_SONIOX_API_KEY);
  const [outputText, setOutputText] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const { settings, loadSettings } = useVoiceStore();
  const deviceAdapter = useState(() => new BrowserMediaDeviceAdapter())[0];

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Add log entry
  const log = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev.slice(-19), `[${timestamp}] ${message}`]);
  }, []);

  // Mock text input adapter that writes to our output
  const textInputAdapter: ITextInputAdapter = {
    async insertText(text: string): Promise<boolean> {
      log(`insertText called: "${text.slice(0, 50)}..."`);
      setOutputText((prev) => prev + text);
      return true;
    },
  };

  // Mock system adapter
  const systemAdapter: ISystemAdapter = {
    async copyToClipboard(text: string): Promise<void> {
      log(`copyToClipboard called: "${text.slice(0, 50)}..."`);
      await navigator.clipboard.writeText(text);
    },
  };

  const {
    state,
    mode,
    isRecording,
    isProcessing,
    progress,
    finalText,
    partialText,
    visualization,
    error,
    startRecording,
    stopRecording,
    reset,
  } = useRecordingSession({
    apiKey,
    languageHints: ['en'],
    deviceAdapter,
    textInputAdapter,
    systemAdapter,
    onCompleted: (result) => {
      log(`Recording completed: ${JSON.stringify(result)}`);
      if (result.text) {
        setOutputText((prev) => prev + (prev ? '\n' : '') + result.text);
      }
    },
    onError: (err) => {
      log(`Error: ${err.message}`);
    },
  });

  // Handle record button click
  const handleRecordClick = useCallback(async () => {
    log(`Button clicked, state: ${state}, isRecording: ${isRecording}`);

    if (isRecording) {
      log('Stopping recording...');
      await stopRecording();
    } else if (state === 'idle' || state === 'completed' || state === 'error') {
      if (state === 'completed' || state === 'error') {
        reset();
      }
      log('Starting recording...');
      await startRecording();
    }
  }, [state, isRecording, startRecording, stopRecording, reset, log]);

  // Get status text
  const getStatusText = (): string => {
    switch (state) {
      case 'starting':
        return 'Starting...';
      case 'recording':
        return mode === 'async' ? 'Recording...' : 'Listening...';
      case 'stopping':
        return 'Stopping...';
      case 'processing':
        return `Processing... ${progress}%`;
      case 'completed':
        return finalText ? 'Done!' : 'No speech detected';
      case 'error':
        return error || 'Error';
      default:
        return 'Tap to speak';
    }
  };

  const hasApiKey = apiKey.trim() !== '';
  const isDisabled = !hasApiKey || state === 'starting' || state === 'stopping' || isProcessing;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '24px', maxWidth: '900px' }}>
      {/* Header */}
      <div>
        <h2 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: '600' }}>
          Voice Recording Test
        </h2>
        <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
          Test voice recording in isolation. Enter API key, click record, speak, click stop.
        </p>
      </div>

      {/* API Key Input */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <label style={{ fontSize: '14px', fontWeight: '500' }}>Soniox API Key:</label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="Enter your API key"
          style={{
            flex: 1,
            padding: '8px 12px',
            border: '1px solid #ddd',
            borderRadius: '6px',
            fontSize: '14px',
          }}
        />
      </div>

      {/* Main Content */}
      <div style={{ display: 'flex', gap: '24px' }}>
        {/* Left: Record Button */}
        <div style={{ flex: '0 0 200px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={handleRecordClick}
            disabled={isDisabled}
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              border: 'none',
              backgroundColor: isRecording ? '#FF3B30' : hasApiKey ? '#007AFF' : '#ccc',
              color: 'white',
              cursor: isDisabled ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
              boxShadow: isRecording ? '0 0 0 4px rgba(255, 59, 48, 0.3)' : 'none',
            }}
          >
            {isRecording ? (
              <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            ) : isProcessing ? (
              <svg width="32" height="32" viewBox="0 0 24 24" fill="white" style={{ animation: 'spin 1s linear infinite' }}>
                <circle cx="12" cy="12" r="10" fill="none" stroke="white" strokeWidth="2" opacity="0.3" />
                <path d="M12 2a10 10 0 0 1 10 10" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
              </svg>
            )}
          </button>

          {/* Status */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '4px' }}>
              {getStatusText()}
            </div>
            <div style={{ fontSize: '12px', color: '#999' }}>
              Mode: {mode}
            </div>
          </div>

          {/* Waveform */}
          {isRecording && visualization.waveform.length > 0 && (
            <div style={{ width: '100%', padding: '8px 0' }}>
              <WaveformDisplay
                levels={visualization.waveform}
                volume={visualization.volume}
                isActive={true}
                height={40}
                barWidth={4}
                barGap={2}
              />
            </div>
          )}

          {/* Partial Text (realtime mode) */}
          {partialText && (
            <div style={{
              fontSize: '12px',
              color: '#666',
              fontStyle: 'italic',
              textAlign: 'center',
              padding: '8px',
              backgroundColor: '#f5f5f5',
              borderRadius: '4px',
              width: '100%',
            }}>
              {partialText}
            </div>
          )}
        </div>

        {/* Right: Text Output */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ fontSize: '14px', fontWeight: '500' }}>Output:</label>
            <button
              onClick={() => setOutputText('')}
              style={{
                padding: '4px 8px',
                fontSize: '12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                backgroundColor: 'white',
                cursor: 'pointer',
              }}
            >
              Clear
            </button>
          </div>
          <textarea
            value={outputText}
            onChange={(e) => setOutputText(e.target.value)}
            placeholder="Transcribed text will appear here..."
            style={{
              flex: 1,
              minHeight: '200px',
              padding: '12px',
              border: '1px solid #ddd',
              borderRadius: '8px',
              fontSize: '14px',
              resize: 'vertical',
              fontFamily: 'inherit',
            }}
          />
        </div>
      </div>

      {/* Progress Bar */}
      {isProcessing && (
        <div style={{ width: '100%', height: '4px', backgroundColor: '#eee', borderRadius: '2px', overflow: 'hidden' }}>
          <div
            style={{
              width: `${progress}%`,
              height: '100%',
              backgroundColor: '#007AFF',
              transition: 'width 0.3s',
            }}
          />
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div style={{
          padding: '12px',
          backgroundColor: '#FEE',
          border: '1px solid #FAA',
          borderRadius: '8px',
          color: '#C00',
          fontSize: '14px',
        }}>
          {error}
        </div>
      )}

      {/* Debug Logs */}
      <details style={{ marginTop: '16px' }}>
        <summary style={{ cursor: 'pointer', fontSize: '14px', color: '#666' }}>
          Debug Logs ({logs.length})
        </summary>
        <div style={{
          marginTop: '8px',
          padding: '12px',
          backgroundColor: '#1a1a1a',
          borderRadius: '8px',
          fontFamily: 'monospace',
          fontSize: '12px',
          color: '#0f0',
          maxHeight: '200px',
          overflow: 'auto',
        }}>
          {logs.length === 0 ? (
            <span style={{ color: '#666' }}>No logs yet...</span>
          ) : (
            logs.map((log, i) => (
              <div key={i}>{log}</div>
            ))
          )}
        </div>
      </details>

      {/* CSS for spinner animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

const meta: Meta<typeof VoiceRecordingTest> = {
  title: 'Tests/VoiceRecordingTest',
  component: VoiceRecordingTest,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
