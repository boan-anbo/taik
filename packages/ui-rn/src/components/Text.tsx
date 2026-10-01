/**
 * Text Component
 * React Native implementation of TextProps
 */

import React from 'react';
import { Text as RNText, StyleSheet, type TextStyle } from 'react-native';
import { tokens } from '@taik/ui-tokens';
import type { TextProps } from '../types';

export function Text({
  variant = 'body',
  weight,
  color,
  align,
  numberOfLines,
  children,
  testID,
  'aria-label': ariaLabel,
  style,
}: TextProps) {
  const textStyles: TextStyle[] = [
    styles.base,
    styles[`variant_${variant}`],
    weight && styles[`weight_${weight}`],
    align && { textAlign: align },
    color && { color },
  ].filter(Boolean) as TextStyle[];

  return (
    <RNText
      testID={testID}
      accessibilityLabel={ariaLabel}
      style={[textStyles, style]}
      numberOfLines={numberOfLines}
    >
      {children}
    </RNText>
  );
}

const styles = StyleSheet.create({
  base: {
    color: tokens.color.text,
  },

  // Variants
  variant_heading: {
    fontSize: tokens.fontSize.title,
    fontWeight: tokens.fontWeight.bold,
    lineHeight: 28,
  },
  variant_title: {
    fontSize: tokens.fontSize.xl,
    fontWeight: tokens.fontWeight.semibold,
    lineHeight: 24,
  },
  variant_body: {
    fontSize: tokens.fontSize.md,
    fontWeight: tokens.fontWeight.medium,
    lineHeight: tokens.lineHeight.body,
  },
  variant_caption: {
    fontSize: tokens.fontSize.sm,
    fontWeight: tokens.fontWeight.medium,
    color: tokens.color.textSubtle,
    lineHeight: 20,
  },
  variant_label: {
    fontSize: tokens.fontSize.xs,
    fontWeight: tokens.fontWeight.semibold,
    color: tokens.color.secondaryLabel,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Weights
  weight_regular: {
    fontWeight: '400' as TextStyle['fontWeight'],
  },
  weight_medium: {
    fontWeight: tokens.fontWeight.medium,
  },
  weight_semibold: {
    fontWeight: tokens.fontWeight.semibold,
  },
  weight_bold: {
    fontWeight: tokens.fontWeight.bold,
  },
});
