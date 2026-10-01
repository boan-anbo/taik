/**
 * File Upload Debug Story
 *
 * This story helps debug the M4A file upload issue by directly testing
 * the SonioxAsyncClient with the test audio file.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { useState, useCallback } from 'react';
import { SonioxAsyncClient } from '@taik/speech-engine';
import { tokens } from '@taik/ui-tokens';

const SONIOX_API_KEY = import.meta.env.VITE_SONIOX_API_KEY || '';
const TEST_AUDIO_URL = '/test-fixtures/audio/taik-test-audio.m4a';

interface DebugLog {
  time: string;
  level: 'info' | 'error' | 'success';
  message: string;
  data?: unknown;
}

function FileUploadDebugger() {
  const [logs, setLogs] = useState<DebugLog[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const addLog = useCallback((level: DebugLog['level'], message: string, data?: unknown) => {
    const time = new Date().toISOString().split('T')[1].slice(0, 12);
    setLogs((prev) => [...prev, { time, level, message, data }]);
  }, []);

  const runTest = useCallback(async () => {
    setLogs([]);
    setIsRunning(true);

    try {
      // Step 1: Check API key
      addLog('info', 'Checking API key...', { hasKey: !!SONIOX_API_KEY, keyLength: SONIOX_API_KEY.length });
      if (!SONIOX_API_KEY) {
        addLog('error', 'No API key found in VITE_SONIOX_API_KEY');
        return;
      }
      addLog('success', 'API key found');

      // Step 2: Verify and fetch test audio file
      addLog('info', 'Fetching test audio file...', { url: TEST_AUDIO_URL });
      addLog('info', 'Note: File should be at /test-fixtures/audio/taik-test-audio.m4a');

      const response = await fetch(TEST_AUDIO_URL);
      if (!response.ok) {
        addLog('error', `Failed to fetch audio file: ${response.status} ${response.statusText}`);
        return;
      }
      addLog('success', 'Audio file fetched', {
        contentType: response.headers.get('content-type'),
        contentLength: response.headers.get('content-length'),
      });

      // Step 3: Read as ArrayBuffer
      const arrayBuffer = await response.arrayBuffer();
      addLog('success', 'Audio file read as ArrayBuffer', { byteLength: arrayBuffer.byteLength });

      // Step 4: Create Soniox client
      addLog('info', 'Creating SonioxAsyncClient...');
      const client = new SonioxAsyncClient({
        apiKey: SONIOX_API_KEY,
      });
      addLog('success', 'Client created');

      // Step 5: Upload file - manual fetch to see raw response
      addLog('info', 'Uploading file to Soniox...');

      const formData = new FormData();
      const blob = new Blob([arrayBuffer], { type: 'audio/mp4' });
      formData.append('file', blob, 'taik-test-audio.m4a');

      const uploadRes = await fetch('https://api.soniox.com/v1/files', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${SONIOX_API_KEY}` },
        body: formData,
      });

      const rawResponse = await uploadRes.json();
      addLog('info', 'Raw API response', rawResponse);

      if (!uploadRes.ok) {
        addLog('error', 'Upload failed', rawResponse);
        return;
      }

      const fileId = rawResponse.id;
      addLog('success', 'File uploaded!', { fileId, rawResponse });

      // Step 6: Create transcription
      addLog('info', 'Creating transcription job...');
      const transcription = await client.createTranscription({
        fileId,
        languageHints: ['en'],
      });
      addLog('success', 'Transcription job created', {
        id: transcription.id,
        status: transcription.status,
      });

      // Step 7: Wait for completion
      addLog('info', 'Waiting for transcription to complete...');
      const completed = await client.waitForCompletion(transcription.id, (progress) => {
        addLog('info', `Progress: ${progress.status} ${progress.progress}%`);
      });
      addLog('success', 'Transcription completed!', {
        audioDurationMs: completed.audioDurationMs,
      });

      // Step 8: Get transcript
      addLog('info', 'Fetching transcript...');
      const transcript = await client.getTranscript(transcription.id);
      addLog('success', 'Transcript received!', {
        text: transcript.text,
        tokenCount: transcript.tokens?.length,
      });

    } catch (error) {
      addLog('error', `Error: ${error instanceof Error ? error.message : String(error)}`, {
        error: error instanceof Error ? { name: error.name, stack: error.stack } : error,
      });
    } finally {
      setIsRunning(false);
    }
  }, [addLog]);

  const getLogColor = (level: DebugLog['level']): string => {
    switch (level) {
      case 'error': return tokens.color.danger;
      case 'success': return tokens.color.success || '#22c55e';
      default: return tokens.color.text;
    }
  };

  return (
    <div style={{ padding: tokens.space.xl, fontFamily: 'monospace' }}>
      <h2 style={{ marginBottom: tokens.space.lg }}>File Upload Debug</h2>

      <div style={{ marginBottom: tokens.space.lg }}>
        <button
          onClick={runTest}
          disabled={isRunning}
          style={{
            padding: `${tokens.space.md}px ${tokens.space.xl}px`,
            backgroundColor: tokens.color.brand,
            color: 'white',
            border: 'none',
            borderRadius: tokens.radius.md,
            fontSize: tokens.fontSize.md,
            cursor: isRunning ? 'wait' : 'pointer',
            opacity: isRunning ? 0.7 : 1,
          }}
        >
          {isRunning ? 'Running...' : 'Run Upload Test'}
        </button>
      </div>

      <div style={{ marginBottom: tokens.space.md }}>
        <strong>API Key:</strong> {SONIOX_API_KEY ? `${SONIOX_API_KEY.slice(0, 8)}...` : '(not set)'}
      </div>

      <div
        style={{
          backgroundColor: '#1e1e1e',
          borderRadius: tokens.radius.md,
          padding: tokens.space.lg,
          maxHeight: 500,
          overflow: 'auto',
        }}
      >
        {logs.length === 0 ? (
          <div style={{ color: '#666' }}>Click "Run Upload Test" to start debugging...</div>
        ) : (
          logs.map((log, i) => (
            <div key={i} style={{ marginBottom: 4, color: getLogColor(log.level) }}>
              <span style={{ color: '#666' }}>[{log.time}]</span>{' '}
              <span style={{ color: log.level === 'error' ? '#ff6b6b' : log.level === 'success' ? '#69db7c' : '#aaa' }}>
                [{log.level.toUpperCase()}]
              </span>{' '}
              {log.message}
              {log.data && (
                <pre style={{ marginLeft: 20, fontSize: 12, color: '#888' }}>
                  {JSON.stringify(log.data, null, 2)}
                </pre>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const meta: Meta<typeof FileUploadDebugger> = {
  title: 'Debug/FileUploadDebug',
  component: FileUploadDebugger,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
