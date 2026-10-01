/**
 * Modal Component
 * React Native implementation of ModalProps
 */

import React from 'react';
import {
  Modal as RNModal,
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from 'react-native';
import { tokens } from '@taik/ui-tokens';
import type { ModalProps } from '../types';

export function Modal({
  visible,
  onRequestClose,
  onDismiss,
  children,
  animationType = 'slide',
  presentationStyle = 'pageSheet',
  testID,
}: ModalProps) {
  return (
    <RNModal
      testID={testID}
      visible={visible}
      animationType={animationType}
      presentationStyle={presentationStyle}
      onRequestClose={onRequestClose}
      onDismiss={onDismiss}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <SafeAreaView style={styles.safeArea}>
          {children}
        </SafeAreaView>
      </KeyboardAvoidingView>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.color.groupedBackground,
  },
  safeArea: {
    flex: 1,
  },
});
