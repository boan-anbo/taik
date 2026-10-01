import type { ITextInputAdapter, InsertTextOptions, InsertTextResult, InsertionMethod } from '@taik/capabilities';
import { getTaikApi } from '../platform/taik';

export class ElectronTextInputAdapter implements ITextInputAdapter {
  async insertText(options: InsertTextOptions): Promise<InsertTextResult> {
    const method: InsertionMethod = options.method ?? 'auto';
    const ok = await getTaikApi().accessibility.pasteText(options.text);
    return {
      method: method === 'auto' ? 'clipboard' : method,
      success: ok,
      ...(ok ? {} : { error: 'Failed to paste text' }),
    };
  }

  async hasDirectInsertionPermission(): Promise<boolean> {
    return await getTaikApi().accessibility.checkSystemEvents();
  }

  async requestDirectInsertionPermission(): Promise<boolean> {
    return await getTaikApi().accessibility.checkSystemEvents();
  }

  async getSupportedMethods(): Promise<InsertionMethod[]> {
    // We only implement paste-based insertion in Phase 1.
    return ['clipboard'];
  }
}
