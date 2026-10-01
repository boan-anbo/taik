/**
 * Section Component
 * React Native implementation of SectionProps
 * Container for grouped settings/list items
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { tokens } from '@taik/ui-tokens';
import type { SectionProps } from '../types';

export function Section({ title, children, footer }: SectionProps) {
  return (
    <View style={styles.container}>
      {title && <Text style={styles.title}>{title}</Text>}
      <View style={styles.content}>{children}</View>
      {footer && <Text style={styles.footer}>{footer}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: tokens.space.xxl,
  },
  title: {
    fontSize: tokens.fontSize.xs,
    fontWeight: tokens.fontWeight.semibold,
    color: tokens.color.secondaryLabel,
    marginBottom: tokens.space.sm,
    marginLeft: tokens.space.lg,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  content: {
    backgroundColor: tokens.color.secondaryGroupedBackground,
    borderRadius: tokens.radius.md,
    overflow: 'hidden',
  },
  footer: {
    fontSize: tokens.fontSize.xs,
    color: tokens.color.secondaryLabel,
    marginTop: tokens.space.sm,
    marginLeft: tokens.space.lg,
    lineHeight: 18,
  },
});
