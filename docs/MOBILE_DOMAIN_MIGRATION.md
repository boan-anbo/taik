# Mobile App Migration to @taik/domain

## Overview

We've created a shared `@taik/domain` package that contains platform-agnostic business logic (stores, hooks, types). The desktop app already uses it. This document guides the mobile team to migrate the mobile app to use the same shared logic.

## Why?

- **Single source of truth**: Settings, deck buttons, transcripts share the same logic
- **Consistency**: Changes to business logic apply to both platforms
- **Type safety**: Shared TypeScript types prevent drift

## What's in `@taik/domain`?

```
packages/domain/
├── stores/
│   ├── adapter.ts          # Storage adapter configuration
│   ├── settingsStore.ts    # App settings (API keys, language)
│   ├── deckStore.ts        # Quick-action buttons
│   └── transcriptStore.ts  # Transcript history
├── hooks/
│   └── useRecording.ts     # Soniox STT hook
└── types/
    ├── settings.ts
    ├── deck.ts
    ├── transcript.ts
    └── storage-keys.ts
```

## Key Concept: Storage Adapter Injection

The stores don't know how to persist data — they use an **adapter** that you provide at startup.

```typescript
// packages/domain/stores/adapter.ts
let storageAdapter: IStorageAdapter | null = null;

export function configureStorageAdapter(adapter: IStorageAdapter): void {
  storageAdapter = adapter;
}
```

**Desktop** provides `TauriStorageAdapter` (uses Tauri Store plugin)
**Mobile** needs to provide a React Native adapter (e.g., using MMKV or AsyncStorage)

---

## Migration Steps

### Step 1: Create Mobile Storage Adapter

Create a new file in the mobile app:

```typescript
// apps/mobile/src/adapters/RNStorageAdapter.ts

import { MMKV } from 'react-native-mmkv';
import type { IStorageAdapter, StorageChangeCallback, Unsubscribe } from '@taik/capabilities';

const storage = new MMKV();

export class RNStorageAdapter implements IStorageAdapter {
  private listeners: Map<string, Set<StorageChangeCallback<unknown>>> = new Map();

  async get<T>(key: string): Promise<T | null> {
    const value = storage.getString(key);
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    const oldValue = await this.get<T>(key);
    storage.set(key, JSON.stringify(value));
    this.notifyListeners(key, value, oldValue);
  }

  async delete(key: string): Promise<void> {
    const oldValue = await this.get(key);
    storage.delete(key);
    this.notifyListeners(key, null, oldValue);
  }

  async has(key: string): Promise<boolean> {
    return storage.contains(key);
  }

  async keys(): Promise<string[]> {
    return storage.getAllKeys();
  }

  async clear(): Promise<void> {
    storage.clearAll();
  }

  subscribe<T>(key: string, callback: StorageChangeCallback<T>): Unsubscribe {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key)!.add(callback as StorageChangeCallback<unknown>);

    return () => {
      this.listeners.get(key)?.delete(callback as StorageChangeCallback<unknown>);
    };
  }

  async getMultiple<T>(keys: string[]): Promise<Map<string, T | null>> {
    const result = new Map<string, T | null>();
    for (const key of keys) {
      result.set(key, await this.get<T>(key));
    }
    return result;
  }

  async setMultiple<T>(entries: Map<string, T>): Promise<void> {
    for (const [key, value] of entries) {
      await this.set(key, value);
    }
  }

  private notifyListeners<T>(key: string, newValue: T | null, oldValue: T | null): void {
    const callbacks = this.listeners.get(key);
    if (callbacks) {
      for (const callback of callbacks) {
        (callback as StorageChangeCallback<T>)(newValue, oldValue);
      }
    }
  }
}
```

### Step 2: Initialize at App Startup

In your app entry point (e.g., `App.tsx` or `_layout.tsx`):

```typescript
import { useEffect, useState } from 'react';
import { configureStorageAdapter, initializeStores } from '@taik/domain';
import { RNStorageAdapter } from './adapters/RNStorageAdapter';

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Configure the storage adapter BEFORE using any stores
    const adapter = new RNStorageAdapter();
    configureStorageAdapter(adapter);

    // Initialize stores (loads persisted data)
    initializeStores();

    setReady(true);
  }, []);

  if (!ready) {
    return <SplashScreen />;
  }

  return <MainApp />;
}
```

### Step 3: Replace Local Stores with Domain Stores

**Before (local store):**
```typescript
// apps/mobile/stores/useSettings.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useSettingsStore = create(
  persist(
    (set) => ({
      // ... local implementation
    }),
    { name: 'settings' }
  )
);
```

**After (shared domain):**
```typescript
// Just import from domain
import { useSettingsStore } from '@taik/domain';

// Use exactly the same way
const { settings, updateSettings } = useSettingsStore();
```

### Step 4: Update Imports Across the App

Find and replace:

| Old Import | New Import |
|------------|------------|
| `from '../stores/useSettings'` | `from '@taik/domain'` |
| `from '../stores/useDeck'` | `from '@taik/domain'` |
| `from '../types/settings'` | `from '@taik/domain'` |

### Step 5: Handle Type Differences

Check if your existing types match `@taik/domain` types:

```typescript
// @taik/domain types
interface DeckButton {
  id: string;
  label: string;
  action: ButtonAction;
  icon?: string;
  color?: string;
  showInStrip: boolean;
  order: number;
}

interface EngineSettings {
  sonioxApiKey: string | null;
  languageHints: string[];
}
```

If your mobile types are different, you may need to:
1. Migrate existing data to new format
2. Or update `@taik/domain` types to match (and update desktop accordingly)

---

## Storage Key Mapping

The domain uses these storage keys (defined in `packages/domain/src/types/storage-keys.ts`):

| Key | Content |
|-----|---------|
| `taik:settings` | Engine settings (API key, languages) |
| `taik:deck-buttons` | Array of deck buttons |
| `taik:transcripts` | Array of transcript entries |

**Important**: If mobile currently uses different keys (e.g., `@taik/settings`), you'll need to migrate data or update the domain keys.

---

## Testing Checklist

- [ ] App starts without errors
- [ ] Settings persist after app restart
- [ ] Deck buttons load correctly
- [ ] Recording works with Soniox
- [ ] Transcripts save and display
- [ ] No TypeScript errors

---

## Potential Issues

### 1. Storage Key Mismatch
If mobile uses different storage keys, existing user data won't load. Write a one-time migration:

```typescript
async function migrateStorageKeys() {
  const oldSettings = await AsyncStorage.getItem('@taik/settings');
  if (oldSettings) {
    await storage.set('taik:settings', oldSettings);
    await AsyncStorage.removeItem('@taik/settings');
  }
}
```

### 2. Type Incompatibility
If domain types don't match mobile types, either:
- Update domain types (coordinate with desktop team)
- Transform data at the adapter level

### 3. Zustand Version
Domain uses Zustand v5. Check mobile's version:
```bash
npm ls zustand
```
If different, align versions in root `package.json`.

---

## Questions?

Contact the desktop team or check:
- `packages/domain/README.md` (if exists)
- `packages/capabilities/src/storage/IStorageAdapter.ts` for interface details
- `apps/desktop/src/adapters/TauriStorageAdapter.ts` as reference implementation
