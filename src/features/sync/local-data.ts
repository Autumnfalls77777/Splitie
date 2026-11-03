import { appStorage } from '@/lib/storage';
import { usePersonalStore } from '@/features/personal/personal.store';
import { useReminderStore } from '@/features/reminders/reminders.store';
import { useSettingsStore } from '@/features/settings/settings.store';
import { useTripStore } from '@/features/trips/trips.store';
import { enqueue } from './outbox';
import {
  memberToRow,
  personalExpenseToRow,
  reminderToRow,
  settlementToRow,
  tripToRow,
  expenseToRow,
} from './mappers';
import { clearOutbox } from './outbox';

const OWNER_KEY = 'splitie-data-owner';

export function clearLocalData() {
  useTripStore.getState().resetTrips();
  usePersonalStore.getState().resetPersonal();
  useReminderStore.getState().resetReminders();
  void clearOutbox();
}

export function hasLocalData(): boolean {
  const { trips, expenses, settlements } = useTripStore.getState();
  const { expenses: personal } = usePersonalStore.getState();
  const { reminders } = useReminderStore.getState();
  return (
    trips.length > 0 ||
    expenses.length > 0 ||
    settlements.length > 0 ||
    personal.length > 0 ||
    reminders.length > 0
  );
}

export async function claimLocalData(
  userId: string,
): Promise<'same' | 'claimed' | 'switched'> {
  const owner = await appStorage.getItem(OWNER_KEY);
  if (!owner) {
    await appStorage.setItem(OWNER_KEY, userId);
    return 'claimed';
  }
  if (owner === userId) return 'same';

  clearLocalData();
  await appStorage.setItem(OWNER_KEY, userId);
  return 'switched';
}

export async function releaseLocalData() {
  clearLocalData();
  await appStorage.removeItem(OWNER_KEY);
}

/** Upload the current SQLite cache the first time this user claims the device. */
export function enqueueLocalSnapshot() {
  const { trips, expenses, settlements } = useTripStore.getState();
  for (const trip of trips) {
    enqueue('trips', 'upsert', trip.id, tripToRow(trip) as unknown as Record<string, unknown>);
    for (const member of trip.members) {
      enqueue(
        'trip_members',
        'upsert',
        member.id,
        memberToRow(member, trip.id) as unknown as Record<string, unknown>,
      );
    }
  }
  for (const expense of expenses) {
    enqueue(
      'expenses',
      'upsert',
      expense.id,
      expenseToRow(expense) as unknown as Record<string, unknown>,
    );
  }
  for (const settlement of settlements) {
    enqueue(
      'settlements',
      'upsert',
      settlement.id,
      settlementToRow(settlement) as unknown as Record<string, unknown>,
    );
  }

  for (const expense of usePersonalStore.getState().expenses) {
    enqueue(
      'personal_expenses',
      'upsert',
      expense.id,
      personalExpenseToRow(expense) as unknown as Record<string, unknown>,
    );
  }
  for (const reminder of useReminderStore.getState().reminders) {
    enqueue(
      'reminders',
      'upsert',
      reminder.id,
      reminderToRow(reminder) as unknown as Record<string, unknown>,
    );
  }

  const settings = useSettingsStore.getState();
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
