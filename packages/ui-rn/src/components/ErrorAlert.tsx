/**
 * ErrorAlert Component
 * React Native implementation of ErrorAlertProps
 * Displays error messages with consistent styling
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { tokens } from '@taik/ui-tokens';
import type { ErrorAlertProps } from '../types';

export function ErrorAlert({
  message,
  onDismiss,
  dismissLabel = 'Dismiss',
  testID,
}: ErrorAlertProps) {
  return (
    <View testID={testID} style={styles.container}>
      <Text style={styles.message}>{message}</Text>
      {onDismiss && (
        <Pressable
          style={({ pressed }) => [
            styles.dismissButton,
            pressed && styles.dismissButtonPressed,
          ]}
          onPress={onDismiss}
        >
          <Text style={styles.dismissText}>{dismissLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: tokens.color.dangerSurface,
    padding: tokens.space.lg,
    borderRadius: tokens.radius.md,
    marginBottom: tokens.space.lg,
  },
  message: {
    color: tokens.color.danger,
    fontSize: tokens.fontSize.sm,
    marginBottom: tokens.space.md,
  },
  dismissButton: {
    alignSelf: 'flex-start',
  },
  dismissButtonPressed: {
    opacity: 0.7,
  },
  dismissText: {
    color: tokens.color.danger,
    fontSize: tokens.fontSize.sm,
    fontWeight: tokens.fontWeight.medium,
  },
});
