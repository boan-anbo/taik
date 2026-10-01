/**
 * RadioButton Component
 * React Native implementation of RadioButtonProps
 * iOS-style radio button for selection UI
 */

import React from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { tokens } from '@taik/ui-tokens';
import type { RadioButtonProps } from '../types';

export function RadioButton({
  selected,
  onPress,
  disabled = false,
  testID,
  'aria-label': ariaLabel,
}: RadioButtonProps) {
  return (
    <Pressable
      testID={testID}
      accessibilityLabel={ariaLabel}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled }}
      style={({ pressed }) => [
        styles.container,
        pressed && !disabled && styles.pressed,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <View style={[styles.outer, disabled && styles.outerDisabled]}>
        {selected && (
          <View style={[styles.inner, disabled && styles.innerDisabled]} />
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: tokens.space.xs,
  },
  pressed: {
    opacity: 0.7,
  },
  outer: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: tokens.color.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerDisabled: {
    borderColor: tokens.color.systemGray3,
  },
  inner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: tokens.color.brand,
  },
  innerDisabled: {
    backgroundColor: tokens.color.systemGray3,
  },
});
