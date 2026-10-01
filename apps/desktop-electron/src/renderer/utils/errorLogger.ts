/**
 * Error Logger - Captures console errors and forwards across windows
 */

import { APP_LOG_EVENT } from './logEvents';
import { makeLogEntry, useLogStore, type LogEntry, type LogLevel } from '../stores/logStore';
import { emit, listen } from '../platform/events';

declare global {
  interface Window {
    __TAIK_ERROR_LOGGER_INSTALLED__?: boolean;
  }
}

function serializeArgs(args: unknown[]): string {
  return args
    .map((a) => {
      if (a instanceof Error) {
        return `${a.name}: ${a.message}${a.stack ? `\n${a.stack}` : ''}`;
      }
      if (typeof a === 'string') return a;
      if (typeof a === 'number' || typeof a === 'boolean' || a === null || a === undefined) {
        return String(a);
      }
      try {
        return JSON.stringify(a);
      } catch {
        return String(a);
      }
    })
    .join(' ');
}

function getWindowLabel(): string {
  const h = window.location.hash || '#/';
  if (h.includes('/voice-panel')) return 'floating-voice';
  if (h.includes('/deck-panel')) return 'floating-deck';
  return 'main';
}

function toStoreLevel(level: string): LogLevel {
  switch (level) {
    case 'DEBUG':
      return 'debug';
    case 'INFO':
      return 'info';
    case 'WARN':
      return 'warn';
    case 'ERROR':
      return 'error';
    case 'UNCAUGHT':
      return 'uncaught';
    case 'PROMISE':
      return 'promise';
    default:
      return 'log';
  }
}

function publishToUi(entry: LogEntry) {
  const windowLabel = getWindowLabel();

  // Main window owns the log UI; other windows forward logs via app event.
  if (windowLabel === 'main') {
    useLogStore.getState().addEntry(entry);
    return;
  }

  void emit(APP_LOG_EVENT, entry);
}

export function setupErrorLogging() {
  if (window.__TAIK_ERROR_LOGGER_INSTALLED__) {
    return;
  }
  window.__TAIK_ERROR_LOGGER_INSTALLED__ = true;

  console.info('Error logging initialized');

  // Main window: collect logs from other windows.
  if (getWindowLabel() === 'main') {
    void listen(APP_LOG_EVENT, (payload) => {
      const entry = payload as LogEntry | undefined;
      if (!entry) return;
      if (entry.windowLabel === 'main') return;
      useLogStore.getState().addEntry(entry);
    });
  }

  const windowLabel = getWindowLabel();

  // Capture console.error
  const originalError = console.error;
  console.error = (...args) => {
    originalError.apply(console, args);
    const message = serializeArgs(args);
    publishToUi(
      makeLogEntry({
        timestamp: Date.now(),
        level: toStoreLevel('ERROR'),
        windowLabel,
        message,
      })
    );
  };

  // Capture console.warn
  const originalWarn = console.warn;
  console.warn = (...args) => {
    originalWarn.apply(console, args);
    const message = serializeArgs(args);
    publishToUi(
      makeLogEntry({
        timestamp: Date.now(),
        level: toStoreLevel('WARN'),
        windowLabel,
        message,
      })
    );
  };

  // Capture console.log (useful for hotkey + voice panel debugging)
  const originalLog = console.log;
  console.log = (...args) => {
    originalLog.apply(console, args);
    const message = serializeArgs(args);
    publishToUi(
      makeLogEntry({
        timestamp: Date.now(),
        level: toStoreLevel('LOG'),
        windowLabel,
        message,
      })
    );
  };

  // Capture console.info
  const originalInfo = console.info;
  console.info = (...args) => {
    originalInfo.apply(console, args);
    const message = serializeArgs(args);
    publishToUi(
      makeLogEntry({
        timestamp: Date.now(),
        level: toStoreLevel('INFO'),
        windowLabel,
        message,
      })
    );
  };

  // Capture unhandled errors
  window.addEventListener('error', (event) => {
    const message = `${event.message} at ${event.filename}:${event.lineno}:${event.colno}`;
    publishToUi(
      makeLogEntry({
        timestamp: Date.now(),
        level: toStoreLevel('UNCAUGHT'),
        windowLabel,
        message,
      })
    );
  });

  // Capture unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason instanceof Error
      ? `${event.reason.name}: ${event.reason.message}${event.reason.stack ? `\n${event.reason.stack}` : ''}`
      : String(event.reason);
    publishToUi(
      makeLogEntry({
        timestamp: Date.now(),
        level: toStoreLevel('PROMISE'),
        windowLabel,
        message: reason,
      })
    );
  });
}
