/**
 * ModalHeader Component
 * React Native implementation of ModalHeaderProps
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { tokens } from '@taik/ui-tokens';
import type { ModalHeaderProps } from '../types';

export function ModalHeader({
  title,
  onCancel,
  onSave,
  cancelLabel = 'Cancel',
  saveLabel = 'Save',
  saveDisabled = false,
}: ModalHeaderProps) {
  return (
    <View style={styles.container}>
      <Pressable onPress={onCancel} hitSlop={8}>
        <Text style={styles.cancelButton}>{cancelLabel}</Text>
      </Pressable>

      <Text style={styles.title}>{title}</Text>

      {onSave ? (
        <Pressable
          onPress={onSave}
          disabled={saveDisabled}
          hitSlop={8}
        >
          <Text style={[styles.saveButton, saveDisabled && styles.saveDisabled]}>
            {saveLabel}
          </Text>
        </Pressable>
      ) : (
        <View style={styles.placeholder} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: tokens.space.lg,
    backgroundColor: tokens.color.secondaryGroupedBackground,
    borderBottomWidth: 1,
    borderBottomColor: tokens.color.separator,
  },
  title: {
    fontSize: tokens.fontSize.xl,
    fontWeight: tokens.fontWeight.semibold,
    color: tokens.color.black,
  },
  cancelButton: {
    fontSize: tokens.fontSize.xl,
    color: tokens.color.brand,
  },
  saveButton: {
    fontSize: tokens.fontSize.xl,
    color: tokens.color.brand,
    fontWeight: tokens.fontWeight.semibold,
  },
  saveDisabled: {
    opacity: 0.5,
  },
  placeholder: {
    width: 50, // Approximate width of save button for centering
  },
});
