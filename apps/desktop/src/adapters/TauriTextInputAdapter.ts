/**
 * Tauri Text Input Adapter
 * Implements ITextInputAdapter using Tauri v2 APIs and macOS Accessibility
 */

import { invoke } from '@tauri-apps/api/core';
import { writeText, readText } from '@tauri-apps/plugin-clipboard-manager';
import type {
  ITextInputAdapter,
  InsertTextOptions,
  InsertTextResult,
  InsertionMethod,
} from '@taik/capabilities';
import { TextInputError } from '@taik/capabilities';

/**
 * Text input adapter implementation for Tauri desktop app
 * Supports both clipboard and direct text insertion (macOS only)
 */
export class TauriTextInputAdapter implements ITextInputAdapter {
  /**
   * Insert text using the specified method
   */
  async insertText(options: InsertTextOptions): Promise<InsertTextResult> {
    const { text, method = 'auto' } = options;

    // Determine which method to use
    if (method === 'direct' || method === 'auto') {
      // Try direct insertion first if we have permission
      const hasPermission = await this.hasDirectInsertionPermission();
      if (hasPermission) {
        try {
          await invoke('insert_text_direct', { text });
          return {
            success: true,
            method: 'direct',
          };
        } catch (error) {
          // Fall back to clipboard if direct fails (unless explicitly requested)
          if (method === 'direct') {
            return {
              success: false,
              method: 'direct',
              error: error instanceof Error ? error.message : 'Direct insertion failed',
            };
          }
          // auto mode: fall through to clipboard
        }
      } else if (method === 'direct') {
        // Explicitly requested direct but no permission
        return {
          success: false,
          method: 'direct',
          error: 'Accessibility permission not granted',
        };
      }
    }

    // Use clipboard method
    try {
      const previousText = await readText().catch(() => null);
      await writeText(text);

      if (method === 'auto') {
        try {
          await invoke('paste_from_clipboard');
          await new Promise((resolve) => setTimeout(resolve, 60));
        } catch (error) {
          return {
            success: false,
            method: 'clipboard',
            error: error instanceof Error ? error.message : 'Paste failed',
          };
        } finally {
          if (previousText !== null) {
            await writeText(previousText).catch(() => {});
          }
        }
      }

      return {
        success: true,
        method: 'clipboard',
      };
    } catch (error) {
      throw new TextInputError(
        'INSERTION_FAILED',
        'Failed to copy to clipboard',
        error
      );
    }
  }

  /**
   * Check if direct text insertion is available (has accessibility permission)
   */
  async hasDirectInsertionPermission(): Promise<boolean> {
    try {
      return await invoke<boolean>('check_accessibility_permission');
    } catch {
      return false;
    }
  }

  /**
   * Request accessibility permission for direct text insertion
   * On macOS, this will open System Preferences
   */
  async requestDirectInsertionPermission(): Promise<boolean> {
    try {
      return await invoke<boolean>('request_accessibility_permission');
    } catch {
      return false;
    }
  }

  /**
   * Get the list of supported insertion methods on this platform
   */
  async getSupportedMethods(): Promise<InsertionMethod[]> {
    try {
      const methods = await invoke<string[]>('get_supported_insertion_methods');
      return methods as InsertionMethod[];
    } catch {
      // Fallback: clipboard is always supported
      return ['clipboard'];
    }
  }
}
