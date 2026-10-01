/**
 * Card Component
 * React Native implementation of CardProps
 */

import React from 'react';
import { View, Pressable, StyleSheet, type ViewStyle } from 'react-native';
import { tokens } from '@taik/ui-tokens';
import type { CardProps } from '../types';

export function Card({
  children,
  onPress,
  elevated = false,
  padding = 'none',
  testID,
  disabled = false,
}: CardProps) {
  const containerStyles: ViewStyle[] = [
    styles.base,
    styles[`padding_${padding}`],
    elevated && styles.elevated,
  ].filter(Boolean) as ViewStyle[];

  if (onPress) {
    return (
      <Pressable
        testID={testID}
        style={({ pressed }) => [
          ...containerStyles,
          pressed && !disabled && styles.pressed,
        ]}
        onPress={onPress}
        disabled={disabled}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View testID={testID} style={containerStyles}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: tokens.color.secondaryGroupedBackground,
    borderRadius: tokens.radius.md,
    overflow: 'hidden',
  },

  // Padding variants
  padding_none: {},
  padding_sm: {
    padding: tokens.space.sm,
  },
  padding_md: {
    padding: tokens.space.lg,
  },
  padding_lg: {
    padding: tokens.space.xxl,
  },

  elevated: {
    shadowColor: tokens.color.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },

  pressed: {
    opacity: 0.8,
  },
});
