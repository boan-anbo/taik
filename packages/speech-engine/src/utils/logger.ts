/**
 * Structured logging utility
 */

import type { Logger, LoggingConfig } from '../types/config.js';

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4,
};

const PREFIX = '[soniox]';

/** Default console logger */
const consoleLogger: Logger = {
  debug: (msg, ...args) => console.debug(PREFIX, msg, ...args),
  info: (msg, ...args) => console.info(PREFIX, msg, ...args),
  warn: (msg, ...args) => console.warn(PREFIX, msg, ...args),
  error: (msg, ...args) => console.error(PREFIX, msg, ...args),
};

/** No-op logger for silent mode */
const noopLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};

/**
 * Create a logger instance based on configuration
 */
export function createLogger(config?: LoggingConfig): Logger {
  const level = config?.level ?? 'warn';

  if (level === 'silent') {
    return noopLogger;
  }

  const customLogger = config?.logger;
  const minLevel = LOG_LEVELS[level];

  return {
    debug: (msg, ...args) => {
      if (LOG_LEVELS.debug >= minLevel) {
        (customLogger ?? consoleLogger).debug(msg, ...args);
      }
    },
    info: (msg, ...args) => {
      if (LOG_LEVELS.info >= minLevel) {
        (customLogger ?? consoleLogger).info(msg, ...args);
      }
    },
    warn: (msg, ...args) => {
      if (LOG_LEVELS.warn >= minLevel) {
        (customLogger ?? consoleLogger).warn(msg, ...args);
      }
    },
    error: (msg, ...args) => {
      if (LOG_LEVELS.error >= minLevel) {
        (customLogger ?? consoleLogger).error(msg, ...args);
      }
    },
  };
}
