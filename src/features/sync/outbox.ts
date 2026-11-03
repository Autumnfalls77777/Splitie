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
  const key = `${table}:${id}`;
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
    if (userId && operation.table === 'trip_members' && payload.is_you === true) {
      payload.user_id = userId;
    }

    const conflictColumn = operation.table === 'user_settings' ? 'user_id' : 'id';
    const idColumn = operation.table === 'user_settings' ? 'user_id' : 'id';

    const { error } =
      operation.type === 'delete'
        ? await supabase.from(operation.table).delete().eq(idColumn, operation.id)
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
