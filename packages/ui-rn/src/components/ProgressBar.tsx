/**
 * ProgressBar Component
 * React Native implementation of ProgressBarProps
 * Linear progress indicator
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { tokens } from '@taik/ui-tokens';
import type { ProgressBarProps } from '../types';

export function ProgressBar({
  progress,
  testID,
}: ProgressBarProps) {
  // Clamp progress between 0 and 100
  const clampedProgress = Math.max(0, Math.min(100, progress || 0));

  return (
    <View testID={testID} style={styles.container}>
      <View style={[styles.fill, { width: `${clampedProgress}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 6,
    backgroundColor: tokens.color.separator,
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: tokens.color.brand,
    borderRadius: 3,
  },
});
