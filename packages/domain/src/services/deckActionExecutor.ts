/**
 * Deck Action Executor
 * Domain service for executing button actions using capability adapters
 */

import type { ButtonAction } from '../types/deck';
import type {
  ISystemAdapter,
  ITextInputAdapter,
  InsertTextResult,
} from '@taik/capabilities';

/**
 * Result of executing a deck action
 */
export interface ActionExecutionResult {
  /** Whether the action was successful */
  success: boolean;
  /** The action type that was executed */
  actionType: ButtonAction['type'];
  /** Optional message describing what happened */
  message?: string;
  /** For insertText, the method used */
  insertionMethod?: 'clipboard' | 'direct';
}

/**
 * Dependencies for DeckActionExecutor
 */
export interface DeckActionExecutorDeps {
  /** System adapter for clipboard, notifications, etc. */
  systemAdapter: ISystemAdapter;
  /** Optional text input adapter for direct insertion */
  textInputAdapter?: ITextInputAdapter;
  /** Callback when startCapture action is triggered */
  onStartCapture?: () => void;
  /** Callback when openApp action is triggered */
  onOpenApp?: (path?: string) => Promise<void>;
}

/**
 * Interface for deck action execution
 */
export interface IDeckActionExecutor {
  executeAction(action: ButtonAction): Promise<ActionExecutionResult>;
}

/**
 * Executes deck button actions using platform adapters
 */
export class DeckActionExecutor implements IDeckActionExecutor {
  constructor(private deps: DeckActionExecutorDeps) {}

  /**
   * Execute a button action
   */
  async executeAction(action: ButtonAction): Promise<ActionExecutionResult> {
    switch (action.type) {
      case 'insertText':
        return this.handleInsertText(action.text);

      case 'startCapture':
        return this.handleStartCapture();

      case 'openApp':
        return this.handleOpenApp(action.path);

      default:
        return {
          success: false,
          actionType: (action as ButtonAction).type,
          message: `Unknown action type`,
        };
    }
  }

  /**
   * Handle insertText action - tries direct insertion, falls back to clipboard
   */
  private async handleInsertText(text: string): Promise<ActionExecutionResult> {
    const { systemAdapter, textInputAdapter } = this.deps;

    // Try direct insertion if adapter available
    if (textInputAdapter) {
      try {
        const result: InsertTextResult = await textInputAdapter.insertText({
          text,
          method: 'auto',
        });

        if (result.success) {
          return {
            success: true,
            actionType: 'insertText',
            message: result.method === 'direct' ? 'Text inserted' : 'Copied to clipboard',
            insertionMethod: result.method === 'direct' ? 'direct' : 'clipboard',
          };
        }
      } catch (error) {
        // Fall through to clipboard fallback
        console.warn('Direct insertion failed, falling back to clipboard:', error);
      }
    }

    // Fallback: copy to clipboard
    try {
      await systemAdapter.copyToClipboard(text);
      return {
        success: true,
        actionType: 'insertText',
        message: 'Copied to clipboard (paste with Cmd+V)',
        insertionMethod: 'clipboard',
      };
    } catch (error) {
      return {
        success: false,
        actionType: 'insertText',
        message: error instanceof Error ? error.message : 'Failed to copy to clipboard',
      };
    }
  }

  /**
   * Handle startCapture action - triggers recording
   */
  private async handleStartCapture(): Promise<ActionExecutionResult> {
    const { onStartCapture } = this.deps;

    if (!onStartCapture) {
      return {
        success: false,
        actionType: 'startCapture',
        message: 'Start capture handler not configured',
      };
    }

    try {
      onStartCapture();
      return {
        success: true,
        actionType: 'startCapture',
        message: 'Recording started',
      };
    } catch (error) {
      return {
        success: false,
        actionType: 'startCapture',
        message: error instanceof Error ? error.message : 'Failed to start capture',
      };
    }
  }

  /**
   * Handle openApp action - opens an external application
   */
  private async handleOpenApp(path?: string): Promise<ActionExecutionResult> {
    const { onOpenApp } = this.deps;

    if (!path) {
      return {
        success: false,
        actionType: 'openApp',
        message: 'App path not specified',
      };
    }

    if (!onOpenApp) {
      return {
        success: false,
        actionType: 'openApp',
        message: 'Open app handler not configured',
      };
    }

    try {
      await onOpenApp(path);
      return {
        success: true,
        actionType: 'openApp',
        message: `Opened ${path}`,
      };
    } catch (error) {
      return {
        success: false,
        actionType: 'openApp',
        message: error instanceof Error ? error.message : 'Failed to open app',
      };
    }
  }
}
