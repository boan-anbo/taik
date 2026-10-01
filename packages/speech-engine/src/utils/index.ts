/**
 * Utils exports
 */

export {
  SonioxError,
  ConnectionError,
  AudioError,
  ConfigError,
  ProtocolError,
  UnsupportedError,
  TranscriptionError,
  getErrorMessage,
} from './errors.js';

export { createLogger } from './logger.js';

export { EventEmitter } from './event-emitter.js';
