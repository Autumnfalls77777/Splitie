import { appStorage } from '@/lib/storage';
import { captureException } from '@/lib/sentry';
import { supabase } from '@/lib/supabase';

export type SyncTable =
  | 'trips'
  | 'trip_members'
  | 'expenses'
  | 'settlements'
  | 'personal_expenses'
  | 'reminders'
  | 'user_settings';

type SyncOperation = {
  key: string;
  table: SyncTable;
  type: 'upsert' | 'delete';
  id: string;
  payload?: Record<string, unknown>;
  attempts: number;
  lastError?: string;
};

const STORAGE_KEY = 'splitie-sync-outbox';
const MAX_ATTEMPTS = 5;

/** Trips must exist before their members, expenses, and settlements. */
const TABLE_ORDER: Record<SyncTable, number> = {
  trips: 0,
  trip_members: 1,
  expenses: 1,
  settlements: 1,
  personal_expenses: 1,
  reminders: 1,
  user_settings: 1,
};

let queue: SyncOperation[] = [];
let loadPromise: Promise<void> | null = null;
let flushPromise: Promise<FlushResult> | null = null;

export type FlushResult = {
  ok: boolean;
  pending: number;
  error?: string;
};

function mergeQueues(first: SyncOperation[], second: SyncOperation[]): SyncOperation[] {
  const merged = new Map<string, SyncOperation>();
  for (const operation of second) merged.set(operation.key, operation);
  for (const operation of first) merged.set(operation.key, operation);
  return [...merged.values()];
}

async function persist() {
  try {
    await appStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch {
    // The in-memory queue keeps working if storage is temporarily unavailable.
  }
}

export async function loadOutbox(): Promise<void> {
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    const raw = await appStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const persisted = JSON.parse(raw) as SyncOperation[];
        if (Array.isArray(persisted)) queue = mergeQueues(queue, persisted);
      } catch {
        // Corrupt queue: start clean rather than blocking every future sync.
      }
    }
    await persist();
  })();
  return loadPromise;
}

export function enqueue(
  table: SyncTable,
  type: SyncOperation['type'],
  id: string,
  payload?: Record<string, unknown>,
) {
  // Trip member ids are only unique inside a trip, so their queue key and
  // delete filter must include the trip.
  const key =
    table === 'trip_members'
      ? `${table}:${String(payload?.trip_id ?? '')}:${id}`
      : `${table}:${id}`;
  queue = [
    ...queue.filter((operation) => operation.key !== key),
    { key, table, type, id, payload, attempts: 0 },
  ];
  void persist();
}

export function pendingSyncCount() {
  return queue.length;
}

export async function clearOutbox() {
  queue = [];
  await appStorage.removeItem(STORAGE_KEY);
}

async function runFlush(): Promise<FlushResult> {
  await loadOutbox();
  if (!supabase || queue.length === 0) {
    return { ok: true, pending: queue.length };
  }

  // Stable sort so a later trip edit cannot jump ahead of a queued member row.
  queue = [...queue].sort((a, b) => TABLE_ORDER[a.table] - TABLE_ORDER[b.table]);

  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;

  let processed = 0;
  while (queue.length > 0) {
    const operation = queue[0];
    const payload: Record<string, unknown> = { ...(operation.payload ?? {}) };

    // Auth-owned rows derive their owner from the JWT. We never trust a
    // client-supplied user_id, and never send the service role key.
    if (
      userId &&
      (operation.table === 'personal_expenses' ||
        operation.table === 'reminders' ||
        operation.table === 'user_settings')
    ) {
      payload.user_id = userId;
    }
    // trip_members.user_id is never client-supplied. Real memberships are
    // created by SECURITY DEFINER RPCs; the outbox only inserts name-only rows.

    const conflictColumn =
      operation.table === 'user_settings'
        ? 'user_id'
        : operation.table === 'trip_members'
          ? 'trip_id,id'
          : 'id';
    const idColumn = operation.table === 'user_settings' ? 'user_id' : 'id';

    let deleteQuery = supabase.from(operation.table).delete().eq(idColumn, operation.id);
    if (operation.table === 'trip_members') {
      deleteQuery = deleteQuery.eq('trip_id', String(operation.payload?.trip_id ?? ''));
    }

    const { error } =
      operation.type === 'delete'
        ? await deleteQuery
        : await supabase.from(operation.table).upsert(payload, { onConflict: conflictColumn });

    if (error) {
      operation.attempts += 1;
      operation.lastError = error.message;

      if (operation.attempts >= MAX_ATTEMPTS) {
        captureException(new Error(`Sync operation failed: ${error.message}`), {
          table: operation.table,
          operation: operation.type,
          id: operation.id,
        });
        queue.shift();
        processed += 1;
        await persist();
        continue;
      }

      await persist();
      return { ok: false, pending: queue.length, error: error.message };
    }

    queue.shift();
    processed += 1;
    await persist();
  }

  return { ok: true, pending: 0, error: processed > 0 ? undefined : undefined };
}

export function flushOutbox(): Promise<FlushResult> {
  if (!flushPromise) {
    flushPromise = runFlush().finally(() => {
      flushPromise = null;
    });
  }
  return flushPromise;
}
