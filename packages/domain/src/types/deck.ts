/**
 * Deck Button Types
 * Type definitions for deck buttons and actions
 */

/**
 * Button action types
 */
export type ButtonAction =
  | { type: 'insertText'; text: string }
  | { type: 'startCapture' }
  | { type: 'openApp'; path?: string };

/**
 * Deck button model
 */
export interface DeckButton {
  /** Unique identifier */
  id: string;
  /** Display label */
  label: string;
  /** Icon name (SF Symbol on iOS, or icon identifier) */
  icon?: string;
  /** Action to perform when pressed */
  action: ButtonAction;
  /** Show in keyboard strip mode (mobile) or floating deck (desktop) */
  showInStrip: boolean;
  /** Sort order */
  order: number;
}

/**
 * Default button configuration
 */
export const DEFAULT_BUTTONS: DeckButton[] = [
  {
    id: 'continue',
    label: 'Continue',
    icon: 'arrow.right.circle',
    action: { type: 'insertText', text: 'Continue' },
    showInStrip: true,
    order: 0,
  },
  {
    id: 'fix',
    label: 'Fix This',
    icon: 'wrench.and.screwdriver',
    action: { type: 'insertText', text: 'Please fix this issue' },
    showInStrip: true,
    order: 1,
  },
  {
    id: 'explain',
    label: 'Explain',
    icon: 'questionmark.circle',
    action: { type: 'insertText', text: 'Please explain this' },
    showInStrip: true,
    order: 2,
  },
  {
    id: 'summarize',
    label: 'Summarize',
    icon: 'doc.text',
    action: { type: 'insertText', text: 'Please summarize this' },
    showInStrip: true,
    order: 3,
  },
  {
    id: 'review',
    label: 'Review',
    icon: 'checkmark.circle',
    action: { type: 'insertText', text: 'Please review this code' },
    showInStrip: false,
    order: 4,
  },
  {
    id: 'test',
    label: 'Write Tests',
    icon: 'testtube.2',
    action: { type: 'insertText', text: 'Please write tests for this' },
    showInStrip: false,
    order: 5,
  },
];
