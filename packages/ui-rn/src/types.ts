/**
 * UI Component Types
 * Type definitions for React Native UI components
 */

import type { ReactNode } from 'react';
import type { KeyboardTypeOptions, TextInputProps, ModalProps as RNModalProps, StyleProp, TextStyle } from 'react-native';

// =============================================================================
// Button
// =============================================================================

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'danger' | 'recording';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  onPress?: () => void;
  children?: ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
  disabled?: boolean;
  testID?: string;
  'aria-label'?: string;
}

// =============================================================================
// Text
// =============================================================================

export type TextVariant = 'heading' | 'title' | 'body' | 'caption' | 'label';
export type TextWeight = 'regular' | 'medium' | 'semibold' | 'bold';
export type TextAlign = 'left' | 'center' | 'right';

export interface TextProps {
  variant?: TextVariant;
  weight?: TextWeight;
  color?: string;
  align?: TextAlign;
  numberOfLines?: number;
  children?: ReactNode;
  testID?: string;
  'aria-label'?: string;
  style?: StyleProp<TextStyle>;
}

// =============================================================================
// Card
// =============================================================================

export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

export interface CardProps {
  padding?: CardPadding;
  elevated?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  children?: ReactNode;
  testID?: string;
}

// =============================================================================
// Input
// =============================================================================

export interface InputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  label?: string;
  helpText?: string;
  secureTextEntry?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  disabled?: boolean;
  editable?: boolean;
  autoFocus?: boolean;
  autoCapitalize?: TextInputProps['autoCapitalize'];
  autoCorrect?: boolean;
  keyboardType?: KeyboardTypeOptions;
  testID?: string;
}

// =============================================================================
// Modal
// =============================================================================

export interface ModalProps {
  visible: boolean;
  onRequestClose?: () => void;
  onDismiss?: () => void;
  animationType?: RNModalProps['animationType'];
  presentationStyle?: RNModalProps['presentationStyle'];
  children?: ReactNode;
  testID?: string;
}

// =============================================================================
// ModalHeader
// =============================================================================

export interface ModalHeaderProps {
  title: string;
  onCancel?: () => void;
  onSave?: () => void;
  cancelLabel?: string;
  saveLabel?: string;
  saveDisabled?: boolean;
}

// =============================================================================
// Section
// =============================================================================

export interface SectionProps {
  title?: string;
  footer?: string;
  children?: ReactNode;
}

// =============================================================================
// ListRow
// =============================================================================

export interface ListRowProps {
  title: string;
  subtitle?: string;
  value?: string;
  onPress?: () => void;
  showChevron?: boolean;
  showTopBorder?: boolean;
  accessoryRight?: ReactNode;
  disabled?: boolean;
  testID?: string;
}

// =============================================================================
// Modal Components - Deck Button
// =============================================================================

// Note: ButtonAction and DeckButton types should be imported from @taik/domain
// These types are not duplicated here to avoid conflicts with the canonical definitions

export interface ButtonEditorProps<TButton = unknown> {
  button: TButton;
  isNew: boolean;
  onSave: (button: TButton) => void;
  onDelete: (id: string) => void;
  onCancel: () => void;
}

// =============================================================================
// Modal Components - API Key
// =============================================================================

export interface ApiKeyEditorProps {
  currentKey?: string;
  onSave: (apiKey: string) => void;
  onCancel: () => void;
  title?: string;
  placeholder?: string;
  helpText?: string;
}

// =============================================================================
// Modal Components - Language Selector
// =============================================================================

export interface LanguageOption {
  code: string;
  name: string;
}

export interface LanguageSelectorProps {
  currentLanguages: string[];
  availableLanguages?: LanguageOption[];
  onSave: (languages: string[]) => void;
  onCancel: () => void;
  allowMultiple?: boolean;
  helpText?: string;
}

// =============================================================================
// RadioButton
// =============================================================================

export interface RadioButtonProps {
  selected: boolean;
  onPress?: () => void;
  disabled?: boolean;
  testID?: string;
  'aria-label'?: string;
}

// =============================================================================
// ErrorAlert
// =============================================================================

export interface ErrorAlertProps {
  message: string;
  onDismiss?: () => void;
  dismissLabel?: string;
  testID?: string;
}

// =============================================================================
// ProgressBar
// =============================================================================

export interface ProgressBarProps {
  progress: number; // 0-100
  testID?: string;
}
