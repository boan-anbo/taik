/**
 * Taik - Speech-to-Text App
 * Main entry point with tab navigation
 */

import React, { useEffect, useCallback } from 'react';
import { StyleSheet, Alert, LogBox } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { setNativeAudioModule } from '@taik/speech-engine';
import { configureStorageAdapter } from '@taik/domain';
import { TabNavigator } from './src/navigation/TabNavigator';
import { AudioCaptureModule, isAudioCaptureAvailable } from './src/native/AudioCaptureModule';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { RNStorageAdapter } from './src/adapters/RNStorageAdapter';
import { initializeStores, cleanupStores } from './src/stores';

// Ignore specific warnings in development
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
]);

export default function App() {
  const isStorybookEnabled =
    __DEV__ &&
    (process.env.STORYBOOK_ENABLED === 'true' ||
      process.env.STORYBOOK_ENABLED === '1');

  if (isStorybookEnabled) {
    const StorybookUIRoot = require('./.rnstorybook').default;
    return <StorybookUIRoot />;
  }

  useEffect(() => {
    // Register native audio module with speech-engine library
    if (isAudioCaptureAvailable()) {
      setNativeAudioModule(AudioCaptureModule);
    } else {
      // This will happen in Expo Go - native modules aren't available
      Alert.alert(
        'Development Mode',
        'Native audio capture is not available. Run with `npx expo run:ios` for full functionality.'
      );
    }

    // Configure storage adapter for @taik/domain stores
    configureStorageAdapter(new RNStorageAdapter());

    // Initialize stores and sync
    initializeStores();

    return () => {
      cleanupStores();
    };
  }, []);

  const handleErrorReset = useCallback(() => {
    // Could reload the app or navigate to a safe state
  }, []);

  return (
    <SafeAreaProvider>
      <ErrorBoundary onReset={handleErrorReset}>
        <NavigationContainer>
          <StatusBar style="auto" />
          <TabNavigator />
        </NavigationContainer>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
