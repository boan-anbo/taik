import { useMemo, useState } from 'react';
import { useLogStore, type LogLevel } from '../stores/logStore';
import { useSettingsStore, useTranscriptStore, useVoiceStore } from '@taik/domain';
import { buildBugReportBundle, buildDiagnosticsSnapshot } from '../utils/diagnostics';
import { systemAdapter } from '../platform/system';
import { getTaikApi } from '../platform/taik';

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString();
}

function levelColor(level: LogLevel): string {
  switch (level) {
    case 'error':
    case 'uncaught':
    case 'promise':
      return 'var(--color-danger)';
    case 'warn':
      return 'var(--color-processing)';
    case 'info':
      return 'var(--color-brand)';
    case 'debug':
      return 'var(--color-text-subtle)';
    default:
      return 'var(--color-text)';
  }
}

export function LogsScreen() {
  const { entries, clear } = useLogStore();
  const { engineSettings } = useSettingsStore();
  const { settings: voiceSettings, windowPositions: voiceWindowPositions } = useVoiceStore();
  const { entries: transcriptEntries } = useTranscriptStore();
  const [windowFilter, setWindowFilter] = useState<string>('all');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [query, setQuery] = useState('');
  const [includeTranscriptText, setIncludeTranscriptText] = useState(false);

  const encodeText = (text: string): ArrayBuffer => {
    const u8 = new TextEncoder().encode(text);
    return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength);
  };

  const windowLabels = useMemo(() => {
    const set = new Set<string>();
    for (const e of entries) set.add(e.windowLabel);
    return Array.from(set).sort();
  }, [entries]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((e) => {
      if (windowFilter !== 'all' && e.windowLabel !== windowFilter) return false;
      if (levelFilter !== 'all' && e.level !== levelFilter) return false;
      if (q && !e.message.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [entries, levelFilter, query, windowFilter]);

  const handleCopy = async () => {
    const text = filtered
      .map((e) => `[${formatTime(e.timestamp)}] [${e.windowLabel}] [${e.level}] ${e.message}`)
      .join('\n');
    try {
      await systemAdapter.copyToClipboard(text);
    } catch {
      // ignore
    }
  };

  const exportText = useMemo(() => {
    return filtered
      .map((e) => `[${new Date(e.timestamp).toISOString()}] [${e.windowLabel}] [${e.level}] ${e.message}`)
      .join('\n');
  }, [filtered]);

  const handleExportLogs = async () => {
    const api = getTaikApi();
    const suggested = `taik-logs-${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;
    const result = await api.dialog.save({
      defaultPath: suggested,
      filters: [{ name: 'Text', extensions: ['txt'] }],
    });
    if (result.canceled || !result.filePath) return;

    await api.fs.writeFile(result.filePath, encodeText(exportText));
  };

  const handleExportDiagnostics = async () => {
    let appVersion: string | undefined;
    const api = getTaikApi();
    try {
      appVersion = await api.app.getVersion();
    } catch {
      // ignore
    }

    const snapshot = await buildDiagnosticsSnapshot({
      appName: 'Taik',
      appVersion,
      engineSettings,
      voiceSettings,
      voiceWindowPositions,
      logs: filtered.map((e) => ({
        timestamp: e.timestamp,
        windowLabel: e.windowLabel,
        level: e.level,
        message: e.message,
      })),
    });

    const suggested = `taik-diagnostics-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const result = await api.dialog.save({
      defaultPath: suggested,
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });
    if (result.canceled || !result.filePath) return;

    const json = JSON.stringify(snapshot, null, 2);
    await api.fs.writeFile(result.filePath, encodeText(json));
  };

  const handleExportBugReport = async () => {
    let appVersion: string | undefined;
    const api = getTaikApi();
    try {
      appVersion = await api.app.getVersion();
    } catch {
      // ignore
    }

    const diagnostics = await buildDiagnosticsSnapshot({
      appName: 'Taik',
      appVersion,
      engineSettings,
      voiceSettings,
      voiceWindowPositions,
      logs: entries.map((e) => ({
        timestamp: e.timestamp,
        windowLabel: e.windowLabel,
        level: e.level,
        message: e.message,
      })),
    });

    const bundle = await buildBugReportBundle({
      diagnostics,
      transcripts: transcriptEntries,
      includeTranscriptText,
      uiFilters: {
        logs: { windowFilter, levelFilter, query },
        includeTranscriptText,
      },
    });

    const suggested = `taik-bug-report-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const result = await api.dialog.save({
      defaultPath: suggested,
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });
    if (result.canceled || !result.filePath) return;

    const json = JSON.stringify(bundle, null, 2);
    await api.fs.writeFile(result.filePath, encodeText(json));
  };

  const handleOpenLogsFolder = async () => {
    try {
      await getTaikApi().logs.openFolder();
    } catch {
      // ignore
    }
  };

  return (
    <div className="screen">
      <div className="screen-header">
        <h1 className="screen-title">Logs</h1>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ color: 'var(--color-text-subtle)', fontSize: 12 }}>Window</span>
          <select
            value={windowFilter}
            onChange={(e) => setWindowFilter(e.target.value)}
            style={{ padding: '6px 8px', borderRadius: 8 }}
          >
            <option value="all">All</option>
            {windowLabels.map((label) => (
              <option key={label} value={label}>{label}</option>
            ))}
          </select>
        </label>

        <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ color: 'var(--color-text-subtle)', fontSize: 12 }}>Level</span>
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            style={{ padding: '6px 8px', borderRadius: 8 }}
          >
            <option value="all">All</option>
            <option value="error">error</option>
            <option value="warn">warn</option>
            <option value="info">info</option>
            <option value="log">log</option>
            <option value="debug">debug</option>
            <option value="uncaught">uncaught</option>
            <option value="promise">promise</option>
          </select>
        </label>

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search…"
          style={{
            flex: '1 1 220px',
            padding: '6px 10px',
            borderRadius: 10,
            border: '1px solid rgba(0,0,0,0.12)',
          }}
        />

        <button
          type="button"
          onClick={() => void handleCopy()}
          style={{ padding: '6px 10px', borderRadius: 10 }}
        >
          Copy
        </button>
        <button
          type="button"
          onClick={() => void handleExportLogs()}
          style={{ padding: '6px 10px', borderRadius: 10 }}
        >
          Export Logs
        </button>
        <button
          type="button"
          onClick={() => void handleExportDiagnostics()}
          style={{ padding: '6px 10px', borderRadius: 10 }}
        >
          Export Diagnostics
        </button>
        <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input
            type="checkbox"
            checked={includeTranscriptText}
            onChange={(e) => setIncludeTranscriptText(e.target.checked)}
          />
          <span style={{ color: 'var(--color-text-subtle)', fontSize: 12 }}>
            Include transcript text
          </span>
        </label>
        <button
          type="button"
          onClick={() => void handleExportBugReport()}
          style={{ padding: '6px 10px', borderRadius: 10 }}
        >
          Export Bug Report
        </button>
        <button
          type="button"
          onClick={() => void handleOpenLogsFolder()}
          style={{ padding: '6px 10px', borderRadius: 10 }}
        >
          Open Logs Folder
        </button>
        <button
          type="button"
          onClick={clear}
          style={{ padding: '6px 10px', borderRadius: 10 }}
        >
          Clear
        </button>
      </div>

      <div
        style={{
          marginTop: 12,
          background: 'rgba(0,0,0,0.03)',
          borderRadius: 12,
          padding: 10,
          height: 'calc(100vh - 220px)',
          overflow: 'auto',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
          fontSize: 12,
          whiteSpace: 'pre-wrap',
        }}
      >
        {filtered.length === 0 ? (
          <div style={{ color: 'var(--color-text-subtle)' }}>No logs yet.</div>
        ) : (
          filtered.map((e) => (
            <div key={e.id} style={{ marginBottom: 8 }}>
              <span style={{ color: 'var(--color-text-subtle)' }}>
                [{formatTime(e.timestamp)}] [{e.windowLabel}]
              </span>{' '}
              <span style={{ color: levelColor(e.level), fontWeight: 700 }}>
                [{e.level}]
              </span>{' '}
              <span style={{ color: 'var(--color-text)' }}>{e.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
