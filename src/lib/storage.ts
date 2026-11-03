import { Platform } from 'react-native';
import type { StateStorage } from 'zustand/middleware';

type NativeKV = {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  removeItemAsync(key: string): Promise<boolean>;
};

let nativeStore: NativeKV | null = null;

if (Platform.OS !== 'web') {
  // SQLite-backed key/value storage. This keeps the app fully offline-first.
  // The expo-sqlite/kv-store module uses a default export with getItemAsync/setItemAsync/removeItemAsync.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const SQLiteStorage = require('expo-sqlite/kv-store') as {
    default: {
      getItemAsync: (key: string) => Promise<string | null>;
      setItemAsync: (key: string, value: string) => Promise<void>;
      removeItemAsync: (key: string) => Promise<boolean>;
    };
  };
  const store = SQLiteStorage.default;
  nativeStore = {
    getItemAsync: (key) => store.getItemAsync(key),
    setItemAsync: (key, value) => store.setItemAsync(key, value),
    removeItemAsync: (key) => store.removeItemAsync(key),
  };
}

const webStore = {
  getItem(key: string) {
    try {
      return globalThis.localStorage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  },
  setItem(key: string, value: string) {
    try {
      globalThis.localStorage?.setItem(key, value);
    } catch {
      // Storage can be unavailable in private browsing; state still works in memory.
    }
  },
  removeItem(key: string) {
    try {
      globalThis.localStorage?.removeItem(key);
    } catch {
      // no-op
    }
  },
};

export const appStorage: StateStorage = {
  getItem: async (name) => {
    if (Platform.OS === 'web') return webStore.getItem(name);
    return nativeStore?.getItemAsync(name) ?? null;
  },
  setItem: async (name, value) => {
    if (Platform.OS === 'web') {
      webStore.setItem(name, value);
      return;
    }
    await nativeStore?.setItemAsync(name, value);
  },
  removeItem: async (name) => {
    if (Platform.OS === 'web') {
      webStore.removeItem(name);
      return;
    }
    await nativeStore?.removeItemAsync(name);
  },
};