/**
 * Input Component
 * React Native implementation of InputProps
 */

import React from 'react';
import { View, TextInput, Text, StyleSheet } from 'react-native';
import { tokens } from '@taik/ui-tokens';
import type { InputProps } from '../types';

export function Input({
  value,
  onChangeText,
  placeholder,
  multiline = false,
  numberOfLines,
  secureTextEntry = false,
  autoCapitalize = 'sentences',
  autoCorrect = true,
  keyboardType = 'default',
  editable = true,
  autoFocus = false,
  label,
  helpText,
  testID,
  disabled = false,
}: InputProps) {
  const isDisabled = disabled || !editable;

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        testID={testID}
        style={[
          styles.input,
          multiline && styles.multiline,
          multiline && numberOfLines ? { height: numberOfLines * 24 } : undefined,
          isDisabled && styles.disabled,
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={tokens.color.tertiaryLabel}
        multiline={multiline}
        numberOfLines={numberOfLines}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCorrect}
        keyboardType={keyboardType}
        editable={!isDisabled}
        autoFocus={autoFocus}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
      {helpText && <Text style={styles.helpText}>{helpText}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: tokens.space.lg,
  },
  label: {
    fontSize: tokens.fontSize.xs,
    fontWeight: tokens.fontWeight.semibold,
    color: tokens.color.secondaryLabel,
    marginBottom: tokens.space.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: tokens.color.secondaryGroupedBackground,
    borderRadius: tokens.radius.md,
    padding: tokens.space.lg,
    fontSize: tokens.fontSize.xl,
    color: tokens.color.black,
  },
  multiline: {
    paddingTop: tokens.space.lg,
    minHeight: 120,
  },
  disabled: {
    opacity: 0.5,
  },
  helpText: {
    fontSize: tokens.fontSize.xs,
    color: tokens.color.secondaryLabel,
    marginTop: tokens.space.sm,
    lineHeight: 18,
  },
});
