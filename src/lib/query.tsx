import { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { useAuthStore } from '@/features/auth/auth.store';
import { usePersonalStore } from '@/features/personal/personal.store';
import { useReminderStore } from '@/features/reminders/reminders.store';
import { useSettingsStore } from '@/features/settings/settings.store';
import { useTripStore } from '@/features/trips/trips.store';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

type PersistedStore = {
  persist: {
    hasHydrated: () => boolean;
    onFinishHydration: (callback: () => void) => () => void;
  };
};

const persistedStores = [
  useAuthStore,
  useTripStore,
  usePersonalStore,
  useReminderStore,
  useSettingsStore,
] as unknown as PersistedStore[];

export function QueryProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const unsubscribers = [
      useTripStore.subscribe(() => {
        queryClient.invalidateQueries();
      }),
      usePersonalStore.subscribe(() => {
        queryClient.invalidateQueries();
      }),
      useReminderStore.subscribe(() => {
        queryClient.invalidateQueries();
      }),
    ];
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, []);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

/** Wait for SQLite-backed Zustand stores to rehydrate before showing the app. */
export function useHydration(): boolean {
  const [hydrated, setHydrated] = useState(() =>
    persistedStores.every((store) => store.persist.hasHydrated()),
  );

  useEffect(() => {
    if (hydrated) return;
    const check = () => {
      if (persistedStores.every((store) => store.persist.hasHydrated())) {
        setHydrated(true);
      }
    };
    const unsubscribers = persistedStores.map((store) => store.persist.onFinishHydration(check));
    const timeout = setTimeout(() => setHydrated(true), 2500);
    check();
    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
      clearTimeout(timeout);
    };
  }, [hydrated]);

  return hydrated;
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
