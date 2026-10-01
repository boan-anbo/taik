/**
 * Tab Navigator
 * Bottom tab navigation matching the iOS prototype structure
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Platform, StyleSheet, View, Text } from 'react-native';
import { RecordingScreen } from '../screens/RecordingScreen';
import { FileTranscriptionScreen } from '../screens/FileTranscriptionScreen';
import { DeckScreen } from '../screens/DeckScreen';
import { SettingsScreen } from '../screens/SettingsScreen';

// Tab navigator param list
export type TabParamList = {
  Record: undefined;
  Files: undefined;
  Deck: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

// Simple icon component using SF Symbols-like text
interface TabIconProps {
  name: 'mic' | 'file' | 'grid' | 'gear';
  focused: boolean;
}

function TabIcon({ name, focused }: TabIconProps) {
  const iconMap = {
    mic: '🎙',
    file: '📁',
    grid: '⊞',
    gear: '⚙',
  };

  return (
    <View style={styles.iconContainer}>
      <Text style={[styles.icon, focused && styles.iconFocused]}>
        {iconMap[name]}
      </Text>
    </View>
  );
}

export function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: '#fff',
        },
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 17,
        },
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#f0f0f0',
          borderTopWidth: 1,
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
          height: Platform.OS === 'ios' ? 84 : 60,
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500',
          marginTop: 4,
        },
      }}
    >
      <Tab.Screen
        name="Record"
        component={RecordingScreen}
        options={{
          tabBarLabel: 'Record',
          tabBarIcon: ({ focused }: { focused: boolean }) => <TabIcon name="mic" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Files"
        component={FileTranscriptionScreen}
        options={{
          tabBarLabel: 'Files',
          tabBarIcon: ({ focused }: { focused: boolean }) => <TabIcon name="file" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Deck"
        component={DeckScreen}
        options={{
          tabBarLabel: 'Deck',
          tabBarIcon: ({ focused }: { focused: boolean }) => <TabIcon name="grid" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Settings',
          tabBarIcon: ({ focused }: { focused: boolean }) => <TabIcon name="gear" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 22,
    opacity: 0.5,
  },
  iconFocused: {
    opacity: 1,
  },
});
