/**
 * Error Logger - Captures console errors and sends to Rust stdout
 */

import { invoke } from '@tauri-apps/api/core';
import { emit, listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { APP_LOG_EVENT } from './logEvents';
import { makeLogEntry, useLogStore, type LogEntry, type LogLevel } from '../stores/logStore';

declare global {
  interface Window {
    __TAIK_ERROR_LOGGER_INSTALLED__?: boolean;
  }
}

function log(level: string, message: string) {
  invoke('log_from_frontend', { level, message }).catch(() => {
    // Fallback if invoke fails
  });
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
  try {
    return getCurrentWindow().label;
  } catch {
    return 'unknown';
  }
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

  emit(APP_LOG_EVENT, entry).catch(() => {
    // Ignore if event plugin isn't available (e.g., running in browser)
  });
}

export function setupErrorLogging() {
  if (window.__TAIK_ERROR_LOGGER_INSTALLED__) {
    return;
  }
  window.__TAIK_ERROR_LOGGER_INSTALLED__ = true;

  const captureVerbose =
    typeof import.meta !== 'undefined' &&
    import.meta.env &&
    import.meta.env.VITE_LOG_VERBOSE === '1';

  log('INFO', 'Error logging initialized');

  // Main window: collect logs from other windows.
  if (getWindowLabel() === 'main') {
    listen<LogEntry>(APP_LOG_EVENT, (event) => {
      if (!event?.payload) return;
      if (event.payload.windowLabel === 'main') return;
      useLogStore.getState().addEntry(event.payload);
    }).catch(() => {
      // Ignore in non-Tauri contexts
    });
  }

  const windowLabel = getWindowLabel();

  // Capture console.error
  const originalError = console.error;
  console.error = (...args) => {
    originalError.apply(console, args);
    const message = serializeArgs(args);
    log('ERROR', message);
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
    log('WARN', message);
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
    if (!captureVerbose) return;
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
    if (!captureVerbose) return;
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
    log('UNCAUGHT', message);
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
    log('PROMISE', reason);
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
