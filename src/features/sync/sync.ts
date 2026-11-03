import type { CurrencyCode } from '@/features/settings/settings.store';
import { usePersonalStore } from '@/features/personal/personal.store';
import { useReminderStore } from '@/features/reminders/reminders.store';
import { useSettingsStore } from '@/features/settings/settings.store';
import { useTripStore } from '@/features/trips/trips.store';
import { captureException } from '@/lib/sentry';
import { supabase } from '@/lib/supabase';
import {
  claimLocalData,
  enqueueLocalSnapshot,
  hasLocalData,
} from './local-data';
import {
  rowToExpense,
  rowToMember,
  rowToPersonalExpense,
  rowToReminder,
  rowToSettlement,
  rowToTrip,
  type ExpenseRow,
  type PersonalExpenseRow,
  type ReminderRow,
  type SettlementRow,
  type TripMemberRow,
  type TripRow,
} from './mappers';
import { flushOutbox, loadOutbox, pendingSyncCount } from './outbox';

export type SyncResult = {
  ok: boolean;
  status: 'synced' | 'offline' | 'pending' | 'not-configured';
  error?: string;
};

let inFlight: Promise<SyncResult> | null = null;

async function remoteIsEmpty(): Promise<boolean> {
  const client = supabase;
  if (!client) return false;

  const [trips, personal, reminders] = await Promise.all([
    client.from('trips').select('id', { count: 'exact', head: true }),
    client.from('personal_expenses').select('id', { count: 'exact', head: true }),
    client.from('reminders').select('id', { count: 'exact', head: true }),
  ]);

  const firstError = trips.error ?? personal.error ?? reminders.error;
  if (firstError) throw firstError;

  return (trips.count ?? 0) === 0 && (personal.count ?? 0) === 0 && (reminders.count ?? 0) === 0;
}

async function pullRemoteData(userId: string): Promise<void> {
  const client = supabase;
  if (!client) return;

  const { data: tripRows, error: tripsError } = await client
    .from('trips')
    .select('*')
    .order('created_at', { ascending: false });
  if (tripsError) throw tripsError;

  const trips = (tripRows ?? []) as TripRow[];
  const tripIds = trips.map((trip) => trip.id);

  const [membersResult, expensesResult, settlementsResult, personalResult, remindersResult, settingsResult] =
    await Promise.all([
      tripIds.length
        ? client.from('trip_members').select('*').in('trip_id', tripIds)
        : Promise.resolve({ data: [], error: null }),
      tripIds.length
        ? client.from('expenses').select('*').in('trip_id', tripIds)
        : Promise.resolve({ data: [], error: null }),
      tripIds.length
        ? client.from('settlements').select('*').in('trip_id', tripIds)
        : Promise.resolve({ data: [], error: null }),
      client.from('personal_expenses').select('*').order('date', { ascending: false }),
      client.from('reminders').select('*').order('due_date', { ascending: true }),
      client.from('user_settings').select('*').eq('user_id', userId).maybeSingle(),
    ]);

  const firstError =
    membersResult.error ??
    expensesResult.error ??
    settlementsResult.error ??
    personalResult.error ??
    remindersResult.error ??
    settingsResult.error;
  if (firstError) throw firstError;

  const membersByTrip = new Map<string, TripMemberRow[]>();
  for (const row of (membersResult.data ?? []) as TripMemberRow[]) {
    const list = membersByTrip.get(row.trip_id) ?? [];
    list.push(row);
    membersByTrip.set(row.trip_id, list);
  }

  const localTrips = trips.map((row) => {
    const memberRows = membersByTrip.get(row.id) ?? [];
    const members = memberRows.length
      ? memberRows.map((member) => rowToMember(member, userId))
      : Array.isArray(row.members)
        ? row.members
        : [];
    return rowToTrip(row, members, userId);
  });

  useTripStore.getState().replaceAll({
    trips: localTrips,
    expenses: ((expensesResult.data ?? []) as ExpenseRow[]).map(rowToExpense),
    settlements: ((settlementsResult.data ?? []) as SettlementRow[]).map(rowToSettlement),
  });

  usePersonalStore.getState().replaceAll(
    ((personalResult.data ?? []) as PersonalExpenseRow[]).map(rowToPersonalExpense),
    settingsResult.data?.monthly_budget_paise === undefined
      ? undefined
      : Number(settingsResult.data.monthly_budget_paise),
  );

  useReminderStore
    .getState()
    .replaceAll(((remindersResult.data ?? []) as ReminderRow[]).map(rowToReminder));

  if (settingsResult.data) {
    const row = settingsResult.data;
    useSettingsStore.setState({
      themeMode: row.theme_mode,
      currency: row.currency as CurrencyCode,
      hapticsEnabled: row.haptics_enabled,
      notificationsEnabled: row.notifications_enabled,
      reminderLeadDays: row.reminder_lead_days,
      compactNumbers: row.compact_numbers,
    });
  }
}

export function syncNow(userId: string): Promise<SyncResult> {
  if (inFlight) return inFlight;

  inFlight = (async (): Promise<SyncResult> => {
    if (!supabase) return { ok: false, status: 'not-configured' };

    try {
      await loadOutbox();
      await claimLocalData(userId);

      const flushed = await flushOutbox();
      if (!flushed.ok || pendingSyncCount() > 0) {
        return { ok: false, status: 'pending', error: flushed.error };
      }

      if ((await remoteIsEmpty()) && hasLocalData()) {
        enqueueLocalSnapshot();
        const snapshotFlush = await flushOutbox();
        if (!snapshotFlush.ok || pendingSyncCount() > 0) {
          return { ok: false, status: 'pending', error: snapshotFlush.error };
        }
      }

      await pullRemoteData(userId);
      return { ok: true, status: 'synced' };
    } catch (error) {
      captureException(error, { scope: 'supabase-sync' });
      return {
        ok: false,
        status: 'offline',
        error: error instanceof Error ? error.message : 'Sync failed',
      };
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}
