/**
 * ListRow Component
 * React Native implementation of ListRowProps
 * Used for Settings-style list items
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { tokens } from '@taik/ui-tokens';
import type { ListRowProps } from '../types';

export function ListRow({
  title,
  subtitle,
  value,
  onPress,
  showChevron = false,
  showTopBorder = false,
  accessoryRight,
  testID,
  disabled = false,
}: ListRowProps) {
  const content = (
    <>
      <View style={styles.info}>
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      {value && <Text style={styles.value}>{value}</Text>}
      {accessoryRight}
      {showChevron && <Text style={styles.chevron}>›</Text>}
    </>
  );

  const containerStyles = [
    styles.container,
    showTopBorder && styles.topBorder,
  ];

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
        {content}
      </Pressable>
    );
  }

  return (
    <View testID={testID} style={containerStyles}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: tokens.space.lg,
    backgroundColor: tokens.color.secondaryGroupedBackground,
  },
  topBorder: {
    borderTopWidth: 1,
    borderTopColor: tokens.color.separator,
  },
  pressed: {
    backgroundColor: tokens.color.systemGray5,
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: tokens.fontSize.xl,
    color: tokens.color.black,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: tokens.fontSize.sm,
    color: tokens.color.secondaryLabel,
  },
  value: {
    fontSize: tokens.fontSize.xl,
    color: tokens.color.secondaryLabel,
  },
  chevron: {
    fontSize: 20,
    color: tokens.color.tertiaryLabel,
    fontWeight: '300',
    marginLeft: tokens.space.sm,
  },
});
