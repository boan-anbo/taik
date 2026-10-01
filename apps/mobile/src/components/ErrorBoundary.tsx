/**
 * Error Boundary Component
 * Catches JavaScript errors in child components and displays a fallback UI
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import { tokens } from '@taik/ui-tokens';
import { Button, Text } from '@taik/ui-rn';

interface Props {
  children: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to console in development
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={styles.container}>
          <View style={styles.content}>
            <Text variant="title" color={tokens.color.danger} style={styles.title}>
              Something went wrong
            </Text>
            <Text variant="body" color={tokens.color.secondaryLabel} align="center" style={styles.message}>
              {this.state.error?.message || 'An unexpected error occurred'}
            </Text>
            <Button variant="primary" onPress={this.handleReset}>
              Try Again
            </Button>
          </View>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.color.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: tokens.space.xxl,
  },
  title: {
    marginBottom: tokens.space.md,
  },
  message: {
    marginBottom: tokens.space.xxl,
  },
});
