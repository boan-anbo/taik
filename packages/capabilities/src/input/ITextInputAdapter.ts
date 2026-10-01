/**
 * Text Input Adapter Interface
 * Platform-agnostic contract for text insertion into active applications.
 */

/**
 * Text insertion method
 */
export type InsertionMethod = 'clipboard' | 'direct' | 'auto';

/**
 * Options for text insertion
 */
export interface InsertTextOptions {
  /** Text to insert */
  text: string;
  /** Preferred insertion method */
  method?: InsertionMethod;
  /** Clear existing selection before inserting (direct mode only) */
  replaceSelection?: boolean;
}

/**
 * Text insertion result
 */
export interface InsertTextResult {
  /** Method that was actually used */
  method: InsertionMethod;
  /** Whether insertion was successful */
  success: boolean;
  /** Error message if unsuccessful */
  error?: string;
}

/**
 * Text Input Adapter Interface
 * Abstracts platform-specific text insertion mechanisms
 */
export interface ITextInputAdapter {
  /**
   * Insert text into the currently focused application
   * @param options - Insertion options
   * @returns Promise with result details
   */
  insertText(options: InsertTextOptions): Promise<InsertTextResult>;

  /**
   * Check if direct insertion is available
   * On macOS, requires Accessibility permission
   */
  hasDirectInsertionPermission(): Promise<boolean>;

  /**
   * Request direct insertion permission
   * On macOS, opens System Preferences
   * @returns Whether permission was granted
   */
  requestDirectInsertionPermission(): Promise<boolean>;

  /**
   * Get supported insertion methods on this platform
   */
  getSupportedMethods(): Promise<InsertionMethod[]>;
}

/**
 * Error codes for text input operations
 */
export type TextInputErrorCode =
  | 'PERMISSION_DENIED'
  | 'NOT_SUPPORTED'
  | 'INSERTION_FAILED'
  | 'UNKNOWN';

/**
 * Error thrown by text input operations
 */
export class TextInputError extends Error {
  constructor(
    public readonly code: TextInputErrorCode,
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'TextInputError';
  }
}
