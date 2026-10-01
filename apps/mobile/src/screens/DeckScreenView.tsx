/**
 * Deck Screen (View)
 * Pure/presentational component for Storybook-friendly iteration.
 */

import React from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  SafeAreaView,
} from 'react-native';
import { tokens } from '@taik/ui-tokens';
import { Button, Text, Card } from '@taik/ui-rn';
import type { DeckButton, ButtonAction } from '../types/ipc';

// Local view props interface using the actual app types
export interface DeckScreenViewProps {
  buttons: DeckButton[];
  isLoading: boolean;
  onAddButton: () => void;
  onEditButton: (button: DeckButton) => void;
}

// Helper to get action display text
function getActionText(action: ButtonAction): string {
  switch (action.type) {
    case 'insertText':
      return action.text ?? '(empty)';
    case 'startCapture':
      return 'Start voice capture';
    case 'openApp':
      return `Open app: ${action.path ?? 'main'}`;
    default:
      return 'Unknown action';
  }
}

export function DeckScreenView({
  buttons,
  isLoading,
  onAddButton,
  onEditButton,
}: DeckScreenViewProps) {
  const renderButton = ({ item }: { item: DeckButton }) => (
    <View style={styles.cardWrapper}>
      <Card padding="md" elevated onPress={() => onEditButton(item)}>
        <View style={styles.buttonCardContent}>
          <View style={styles.buttonInfo}>
            <Text variant="body" weight="semibold">{item.label}</Text>
            <Text variant="caption" color={tokens.color.secondaryLabel} numberOfLines={1}>
              {getActionText(item.action)}
            </Text>
          </View>
          <View style={styles.buttonMeta}>
            {item.showInStrip && (
              <View style={styles.stripBadge}>
                <Text variant="caption" color={tokens.color.white}>Strip</Text>
              </View>
            )}
            <Text variant="body" color={tokens.color.tertiaryLabel}>›</Text>
          </View>
        </View>
      </Card>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={buttons}
        keyExtractor={(item) => item.id}
        renderItem={renderButton}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          isLoading ? (
            <Text variant="body" color={tokens.color.secondaryLabel} align="center">
              Loading...
            </Text>
          ) : (
            <Text variant="body" color={tokens.color.secondaryLabel} align="center">
              No buttons yet. Tap + to add one.
            </Text>
          )
        }
      />

      <View style={styles.addButtonContainer}>
        <Button variant="primary" size="lg" fullWidth onPress={onAddButton}>
          + Add Button
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.color.groupedBackground,
  },
  list: {
    padding: tokens.space.lg,
    paddingBottom: 100,
  },
  cardWrapper: {
    marginBottom: tokens.space.md,
  },
  buttonCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonInfo: {
    flex: 1,
    gap: tokens.space.xs,
  },
  buttonMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.sm,
  },
  stripBadge: {
    backgroundColor: tokens.color.brand,
    paddingHorizontal: tokens.space.sm,
    paddingVertical: tokens.space.xs,
    borderRadius: 6,
  },
  addButtonContainer: {
    position: 'absolute',
    bottom: tokens.space.xl,
    left: tokens.space.lg,
    right: tokens.space.lg,
  },
});
