/**
 * Microphone Button Component
 * Matches the Swift prototype's mic button with states:
 * - idle: blue (ready to record)
 * - recording: red with pulse animation
 * - processing: orange with spinner
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { tokens } from '@taik/ui-tokens';
import type { RecordingState } from '../hooks/useRecording';

interface MicButtonProps {
  state: RecordingState;
  onPress: () => void;
  disabled?: boolean;
}

export function MicButton({ state, onPress, disabled }: MicButtonProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse animation when recording
  useEffect(() => {
    if (state === 'recording') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [state, pulseAnim]);

  /**
   * Get button color based on state
   */
  const getButtonColor = (): string => {
    switch (state) {
      case 'recording':
        return tokens.color.recording; // Red
      case 'stopping':
      case 'starting':
        return tokens.color.processing; // Orange
      default:
        return tokens.color.brand; // Blue
    }
  };

  /**
   * Get shadow color based on state
   */
  const getShadowColor = (): string => {
    const color = getButtonColor();
    return color;
  };

  /**
   * Render button content
   */
  const renderContent = () => {
    if (state === 'starting' || state === 'stopping') {
      return <ActivityIndicator color="#fff" size="large" />;
    }

    return (
      <View style={styles.iconContainer}>
        {state === 'recording' ? (
          // Stop icon (square)
          <View style={styles.stopIcon} />
        ) : (
          // Mic icon (circle with lines)
          <View style={styles.micIcon}>
            <View style={styles.micHead} />
            <View style={styles.micStand} />
          </View>
        )}
      </View>
    );
  };

  const buttonColor = getButtonColor();
  const shadowColor = getShadowColor();

  return (
    <Animated.View
      style={[
        styles.buttonContainer,
        {
          transform: [{ scale: pulseAnim }],
        },
      ]}
    >
      <Pressable
        testID="mic-button"
        style={[
          styles.button,
          {
            backgroundColor: buttonColor,
            shadowColor: shadowColor,
          },
          disabled && styles.buttonDisabled,
        ]}
        onPress={onPress}
        disabled={disabled}
      >
        {renderContent()}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  buttonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopIcon: {
    width: 32,
    height: 32,
    backgroundColor: tokens.color.background,
    borderRadius: tokens.radius.sm,
  },
  micIcon: {
    alignItems: 'center',
  },
  micHead: {
    width: 24,
    height: 36,
    backgroundColor: tokens.color.background,
    borderRadius: 12,
  },
  micStand: {
    width: 4,
    height: 12,
    backgroundColor: tokens.color.background,
    marginTop: 2,
    borderRadius: 2,
  },
});
