import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { usePersonalStore } from '@/features/personal/personal.store';
import { enqueue } from '@/features/sync/outbox';
import { appStorage } from '@/lib/storage';

export type ThemeMode = 'system' | 'light' | 'dark';
export type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP' | 'AED';

type SettingsState = {
  themeMode: ThemeMode;
  hasOnboarded: boolean;
  hapticsEnabled: boolean;
  notificationsEnabled: boolean;
  currency: CurrencyCode;
  reminderLeadDays: number;
  compactNumbers: boolean;
  setThemeMode: (mode: ThemeMode) => void;
  completeOnboarding: () => void;
  setHaptics: (enabled: boolean) => void;
  setNotifications: (enabled: boolean) => void;
  setCurrency: (currency: CurrencyCode) => void;
  setReminderLeadDays: (days: number) => void;
  setCompactNumbers: (compact: boolean) => void;
  resetSettings: () => void;
};

const initial = {
  themeMode: 'system' as ThemeMode,
  hasOnboarded: false,
  hapticsEnabled: true,
  notificationsEnabled: true,
  currency: 'INR' as CurrencyCode,
  reminderLeadDays: 3,
  compactNumbers: false,
};

function queueSettings(get: () => SettingsState) {
  const settings = get();
  enqueue('user_settings', 'upsert', 'current', {
    theme_mode: settings.themeMode,
    currency: settings.currency,
    haptics_enabled: settings.hapticsEnabled,
    notifications_enabled: settings.notificationsEnabled,
    reminder_lead_days: settings.reminderLeadDays,
    monthly_budget_paise: usePersonalStore.getState().monthlyBudgetPaise,
    compact_numbers: settings.compactNumbers,
  });
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      ...initial,
      setThemeMode: (themeMode) => {
        set({ themeMode });
        queueSettings(get);
      },
      completeOnboarding: () => set({ hasOnboarded: true }),
      setHaptics: (hapticsEnabled) => {
        set({ hapticsEnabled });
        queueSettings(get);
      },
      setNotifications: (notificationsEnabled) => {
        set({ notificationsEnabled });
        queueSettings(get);
      },
      setCurrency: (currency) => {
        set({ currency });
        queueSettings(get);
      },
      setReminderLeadDays: (reminderLeadDays) => {
        set({ reminderLeadDays });
        queueSettings(get);
      },
      setCompactNumbers: (compactNumbers) => {
        set({ compactNumbers });
        queueSettings(get);
      },
      resetSettings: () => set({ ...initial, hasOnboarded: true }),
    }),
    {
      name: 'splitie-settings',
      version: 1,
      storage: createJSONStorage(() => appStorage),
    },
  ),
);
