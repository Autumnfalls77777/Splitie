import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * Supabase sessions are larger than the iOS Keychain's recommended value size,
 * so native tokens are split into chunks. Web falls back to localStorage because
 * SecureStore is not available there.
 *
 * Only auth tokens belong here. Everything user-generated stays in the local
 * SQLite cache so the app keeps working offline.
 */
const CHUNK_SIZE = 1800;
const memory = new Map<string, string>();

const canUseWebStorage = () => {
  try {
    return typeof globalThis.localStorage !== 'undefined';
  } catch {
    return false;
  }
};

function webGet(key: string): string | null {
  if (!canUseWebStorage()) return memory.get(key) ?? null;
  try {
    return globalThis.localStorage.getItem(key);
  } catch {
    return memory.get(key) ?? null;
  }
}

function webSet(key: string, value: string) {
  memory.set(key, value);
  if (!canUseWebStorage()) return;
  try {
    globalThis.localStorage.setItem(key, value);
  } catch {
    // Private browsing can reject writes; the in-memory copy still works.
  }
}

function webRemove(key: string) {
  memory.delete(key);
  if (!canUseWebStorage()) return;
  try {
    globalThis.localStorage.removeItem(key);
  } catch {
    // no-op
  }
}

async function nativeGet(key: string): Promise<string | null> {
  const count = Number(await SecureStore.getItemAsync(`${key}.chunks`));
  if (!Number.isFinite(count) || count <= 0) {
    return SecureStore.getItemAsync(key);
  }
  const parts: string[] = [];
  for (let index = 0; index < count; index += 1) {
    const part = await SecureStore.getItemAsync(`${key}.${index}`);
    if (part === null) return null;
    parts.push(part);
  }
  return parts.join('');
}

async function nativeSet(key: string, value: string) {
  await nativeRemove(key);
  const chunks = Math.ceil(value.length / CHUNK_SIZE);
  const writes: Promise<void>[] = [];
  for (let index = 0; index < chunks; index += 1) {
    writes.push(
      SecureStore.setItemAsync(
        `${key}.${index}`,
        value.slice(index * CHUNK_SIZE, (index + 1) * CHUNK_SIZE),
      ),
    );
  }
  await Promise.all(writes);
  await SecureStore.setItemAsync(`${key}.chunks`, String(chunks));
}

async function nativeRemove(key: string) {
  const count = Number(await SecureStore.getItemAsync(`${key}.chunks`));
  const deletes: Promise<void>[] = [SecureStore.deleteItemAsync(key)];
  if (Number.isFinite(count) && count > 0) {
    for (let index = 0; index < count; index += 1) {
      deletes.push(SecureStore.deleteItemAsync(`${key}.${index}`));
    }
  }
  await Promise.all(deletes);
  await SecureStore.deleteItemAsync(`${key}.chunks`);
}

export const secureStorage = {
  getItem: async (key: string) => (Platform.OS === 'web' ? webGet(key) : nativeGet(key)),
  setItem: async (key: string, value: string) => {
    if (Platform.OS === 'web') webSet(key, value);
    else await nativeSet(key, value);
  },
  removeItem: async (key: string) => {
    if (Platform.OS === 'web') webRemove(key);
    else await nativeRemove(key);
  },
};
