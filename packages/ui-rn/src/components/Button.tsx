/**
 * Button Component
 * React Native implementation of ButtonProps
 */

import React from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  ActivityIndicator,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { tokens } from '@taik/ui-tokens';
import type { ButtonProps } from '../types';

export function Button({
  variant = 'primary',
  size = 'md',
  onPress,
  children,
  loading = false,
  fullWidth = false,
  disabled = false,
  testID,
  'aria-label': ariaLabel,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  const containerStyles: ViewStyle[] = [
    styles.base,
    styles[`variant_${variant}`],
    styles[`size_${size}`],
    fullWidth && styles.fullWidth,
    isDisabled && styles.disabled,
  ].filter(Boolean) as ViewStyle[];

  const textStyles: TextStyle[] = [
    styles.text,
    styles[`text_${variant}`],
    styles[`text_${size}`],
  ].filter(Boolean) as TextStyle[];

  return (
    <Pressable
      testID={testID}
      accessibilityLabel={ariaLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      style={({ pressed }) => [
        ...containerStyles,
        pressed && !isDisabled && styles.pressed,
      ]}
      onPress={onPress}
      disabled={isDisabled}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' ? tokens.color.white : tokens.color.brand}
          size="small"
        />
      ) : typeof children === 'string' ? (
        <Text style={textStyles}>{children}</Text>
      ) : (
        children
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokens.radius.md,
  },

  // Variants
  variant_primary: {
    backgroundColor: tokens.color.brand,
  },
  variant_secondary: {
    backgroundColor: tokens.color.surface,
  },
  variant_tertiary: {
    backgroundColor: 'transparent',
  },
  variant_danger: {
    backgroundColor: tokens.color.danger,
  },
  variant_recording: {
    backgroundColor: tokens.color.recording,
  },

  // Sizes
  size_sm: {
    paddingVertical: tokens.space.sm,
    paddingHorizontal: tokens.space.md,
    minHeight: 32,
  },
  size_md: {
    paddingVertical: tokens.space.md,
    paddingHorizontal: tokens.space.lg,
    minHeight: 44,
  },
  size_lg: {
    paddingVertical: tokens.space.lg,
    paddingHorizontal: tokens.space.xxl,
    minHeight: 52,
  },

  fullWidth: {
    width: '100%',
  },

  disabled: {
    opacity: 0.5,
  },

  pressed: {
    opacity: 0.8,
  },

  // Text styles
  text: {
    fontWeight: tokens.fontWeight.semibold,
  },
  text_primary: {
    color: tokens.color.white,
  },
  text_secondary: {
    color: tokens.color.text,
  },
  text_tertiary: {
    color: tokens.color.brand,
  },
  text_danger: {
    color: tokens.color.white,
  },
  text_recording: {
    color: tokens.color.white,
  },
  text_sm: {
    fontSize: tokens.fontSize.sm,
  },
  text_md: {
    fontSize: tokens.fontSize.md,
  },
  text_lg: {
    fontSize: tokens.fontSize.xl,
  },
});
