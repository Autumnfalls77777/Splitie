import { useEffect } from 'react';
import { AppState } from 'react-native';
import { create } from 'zustand';

import { useAuthStore } from '@/features/auth/auth.store';
import { syncNow, type SyncResult } from './sync';

type SyncState = {
  status: 'idle' | 'syncing' | 'synced' | 'offline' | 'pending';
  lastSyncedAt: string | null;
  error: string | null;
  apply: (result: SyncResult) => void;
  reset: () => void;
};

export const useSyncStore = create<SyncState>((set) => ({
  status: 'idle',
  lastSyncedAt: null,
  error: null,
  apply: (result) =>
    set({
      status: result.ok
        ? 'synced'
        : result.status === 'pending'
          ? 'pending'
          : result.status === 'not-configured'
            ? 'idle'
            : 'offline',
      lastSyncedAt: result.ok ? new Date().toISOString() : undefined,
      error: result.ok ? null : (result.error ?? null),
    }),
  reset: () => set({ status: 'idle', lastSyncedAt: null, error: null }),
}));

export function SyncGate() {
  const userId = useAuthStore((state) => state.user?.id);

  useEffect(() => {
    if (!userId) {
      useSyncStore.getState().reset();
      return;
    }

    let cancelled = false;
    const run = async () => {
      if (cancelled) return;
      useSyncStore.setState({ status: 'syncing', error: null });
      const result = await syncNow(userId);
      if (!cancelled) useSyncStore.getState().apply(result);
    };

    void run();

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void run();
    });

    const interval = setInterval(() => {
      if (AppState.currentState === 'active') void run();
    }, 60_000);

    const onOnline = () => void run();
    if (typeof globalThis.addEventListener === 'function') {
      globalThis.addEventListener('online', onOnline);
    }

    return () => {
      cancelled = true;
      subscription.remove();
      clearInterval(interval);
      if (typeof globalThis.removeEventListener === 'function') {
        globalThis.removeEventListener('online', onOnline);
      }
    };
  }, [userId]);

  return null;
}
