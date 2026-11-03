# 04 — Backend Plan

## Supabase Schema (PostgreSQL)

All tables use `uuid` primary keys referencing `auth.users` where appropriate. Row-level security (RLS) policies ensure users can only access data they own or are members of.

### 1. `profiles`
| Column | Type | References | Notes |
|--------|------|------------|-------|
| `id` | `uuid` | `primary key` | `REFERENCES auth.users(id)` on delete cascade |
| `name` | `text` | — | User‑display name |
| `email` | `text` | — | Duplicate of auth.users.email (for quick display) |
| `avatar_color` | `text` | — | One of the token colors (lime, clay, sky, lilac, amberSoft, etc.) |
| `created_at` | `timestamptz` | — | `default now()` |

**RLS**: Users can `SELECT` their own profile. Admins (service_role) can manage all.

---

### 2. `trips`
| Column | Type | References | Notes |
|--------|------|------------|-------|
| `id` | `uuid` | `primary key` | — |
| `name` | `text` | — | e.g., "Goa Trip", "Business Dinner" |
| `destination` | `text` | — | Optional free‑form |
| `emoji` | `text` | — | Emoji displayed on trip card (e.g., 🏖️) |
| `cover` | `text` | — | Key into `COVERS` map or URL |
| `start_date` | `date` | — | Trip start |
| `end_date` | `date` | — | Trip end (nullable if ongoing) |
| `budget_paise` | `bigint` | `check (budget_paise > 0)` | Optional total budget |
| `created_by` | `uuid` | `auth.users(id)` | Creator/organizer |
| `created_at` | `timestamptz` | — | `default now()` |

**RLS**: 
- Users can `SELECT`, `INSERT`, `UPDATE`, `DELETE` only trips where they are a member (see `trip_members`).
- The creator (`created_by`) always has full access.

---

### 3. `trip_members`
| Column | Type | References | Notes |
|--------|------|------------|-------|
| `trip_id` | `uuid` | `trips(id)` on delete cascade | — |
| `user_id` | `uuid` | `auth.users(id)` | — |
| `display_name` | `text` | — | Override display name for this trip (nullable; if null, uses `profiles.name`) |
| `color` | `text` | — | One of theme colors for UI chip |
| `is_you` | `boolean` | — | `true` for the logged‑in user in this trip |
| `joined_at` | `timestamptz` | — | `default now()` |
| **Primary key** | `(trip_id, user_id)` | — | — |

**RLS**: 
- Users can `SELECT` rows where `user_id = auth.uid()` or `trip_id` belongs to a trip they’re in.
- Users can `INSERT` only their own row (via trigger or app logic).
- Users can `UPDATE` their own row (e.g., change `display_name`, `color`, `is_you`).
- Deletions cascade from `trips`.

---

### 4. `expenses`
| Column | Type | References | Notes |
|--------|------|------------|-------|
| `id` | `uuid` | `primary key` | — |
| `trip_id` | `uuid` | `trips(id)` on delete cascade | — |
| `title` | `text` | — | e.g., "Dinner at The Rice Boat" |
| `amount_paise` | `bigint` | `check (amount_paise > 0)` | Money stored as integer paise |
| `category` | `text` | — | e.g., "Dining", "Transport", " accommodation" |
| `paid_by_member_id` | `uuid` | `trip_members(id)` | Who paid the bill |
| `date` | `date` | — | Expense date |
| `note` | `text` | — | Optional note |
| `created_by` | `uuid` | `auth.users(id)` | Creator (usually same as `paid_by_member_id`) |
| `created_at` | `timestamptz` | — | `default now()` |

**RLS**: 
- Users can `SELECT` expenses where `trip_id` belongs to a trip they’re a member of.
- Users can `INSERT` expenses for trips they’re in (via app logic that sets `trip_id` and `paid_by_member_id`).
- Users can `UPDATE`/`DELETE` their own expenses (or if they’re the creator).

---

### 5. `expense_splits`
| Column | Type | References | Notes |
|--------|------|------------|-------|
| `expense_id` | `uuid` | `expenses(id)` on delete cascade | — |
| `member_id` | `uuid` | `trip_members(id)` | — |
| `amount_paise` | `bigint` | — | Individual share; always `>= 0`; `SUM = amount_paise of expense` |
| **Primary key** | `(expense_id, member_id)` | — | — |

**RLS**: 
- Users can `SELECT` splits for expenses in trips they’re members of.
- `INSERT` / `UPDATE` / `DELETE` via app logic (guarded by RLS).

---

### 6. `settlements`
| Column | Type | References | Notes |
|--------|------|------------|-------|
| `id` | `uuid` | `primary key` | — |
| `trip_id` | `uuid` | `trips(id)` on delete cascade | — |
| `from_member_id` | `uuid` | `trip_members(id)` | Who pays |
| `to_member_id` | `uuid` | `trip_members(id)` | Who receives |
| `amount_paise` | `bigint` | `check (amount_paise > 0)` | Minimal greedy transfer amount |
| `date` | `date` | — | Settlement date (default now()) |
| `note` | `text` | — | Optional |
| `created_at` | `timestamptz` | — | `default now()` |

**Purpose**: Pre‑computed minimal set of transfers that settle all balances (greedy min‑cash‑flow algorithm run on the client or a function). Users can `SELECT`, `INSERT` (manually add), `DELETE` individual rows.

**RLS**: Same as `expenses` — scoped to trips the user is in.

---

### 7. `personal_expenses`
| Column | Type | References | Notes |
|--------|------|------------|-------|
| `id` | `uuid` | `primary key` | — |
| `user_id` | `uuid` | `auth.users(id)` on delete cascade | — |
| `title` | `text` | — | e.g., "Groceries this week" |
| `amount_paise` | `bigint` | `check (amount_paise > 0)` | — |
| `category` | `text` | — | Category from reduced list (no trip context) |
| `date` | `date` | — | Expense date |
| `note` | `text` | — | Optional |
| `recurrence` | `text` | — | `none` | `weekly` | `monthly` | `yearly` |
| `payment_method` | `text` | — | `cash` | `upi` | `card` | `other` |
| `created_at` | `timestamptz` | — | `default now()` |

**RLS**: Users can only `SELECT`, `INSERT`, `UPDATE`, `DELETE` their own rows (`user_id = auth.uid()`).

---

### 8. `reminders`
| Column | Type | References | Notes |
|--------|------|------------|-------|
| `id` | `uuid` | `primary key` | — |
| `user_id` | `uuid` | `auth.users(id)` | — |
| `type` | `text` | — | `trip_settle` | `personal_payback` | `budget_exceeded` |
| `title` | `text` | — | Human‑readable title |
| `body` | `text` | — | Notification body (may reference amounts, names) |
| `due_date` | `date` | — | When the reminder is due |
| `amount_paise` | `bigint` | — | Optional amount referenced (e.g., share to pay) |
| `trip_id` | `uuid` | `trips(id)` | Nullable; if set, reminder is trip‑scoped |
| `from_member_id` | `uuid` | `trip_members(id)` | Nullable; sender |
| `to_member_id` | `uuid` | `trip_members(id)` | Nullable; recipient |
| `read` | `boolean` | — | `default false` |
| `completed` | `boolean` | — | `default false` |
| `notification_id` | `text` | — | Expo notification ID (after send) |
| `created_at` | `timestamptz` | — | `default now()` |

**RLS**: Users can only access their own reminders (`user_id = auth.uid()`).

---

### 9. `user_settings`
| Column | Type | References | Notes |
|--------|------|------------|-------|
| `user_id` | `uuid` | `primary key` | `auth.users(id)` on delete cascade |
| `theme_mode` | `text` | — | `system` | `light` | `dark` |
| `currency` | `text` | — | `INR` | `USD` | `EUR` | etc.; maps to `getDisplayCurrency()` |
| `haptics_enabled` | `boolean` | — | `default true` |
| `notifications_enabled` | `boolean` | — | `default true` (syncs with Expo permissions) |
| `reminder_lead_days` | `integer` | — | `check (reminder_lead_days >= 1 and <= 14)`; `default 3` |
| `monthly_budget_paise` | `bigint` | `check (monthly_budget_paise >= 0)` | `default 0` (means no budget limit) |
| `compact_numbers` | `boolean` | — | `default true` (e.g., 1,234 vs 1234) |
| `updated_at` | `timestamptz` | — | `default now()` on update |

**RLS**: Users can only `SELECT`, `UPDATE` their own row.

---

## Triggers & Helper Functions (optional, via Supabase SQL Edge)

- **`update_updated_at_column()`**: Trigger on each table sets `updated_at = now()` on every UPDATE.
- **`handle_on_auth_user_created()`**: Trigger on `auth.users` insert → creates a `profiles` row and a `user_settings` row with defaults.
- **`check_user_trip_access()`**: Simple policy function used across RLS policies: `USING ( EXISTS (SELECT 1 FROM trip_members WHERE trip_id = trips.id AND user_id = auth.uid()))`.

## Supabase CLI / Migration Setup

1. `supabase init` (once, in project root).
2. Create migrations under `supabase/migrations/`:
   - `0001_init.sql` — all tables, RLS, triggers above.
   - Subsequent migrations for schema evolution (add columns, indexes, etc.).
3. `supabase migration up` to apply to a project.
4. `.env.example` at repo root:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
5. **Never commit real secrets**; the `.env.example` contains only placeholder comments.

## Demo Mode vs Backend

- **Demo mode** (`DEMO_MODE_ENABLED` in `src/constants/app.ts`) uses **local-first** Zustand persist with `expo-sqlite` (native) / `localStorage` (web). All data (trips, expenses, reminders) lives in the app sandbox; no network calls.
- **When backend is enabled**: Set `DEMO_MODE_ENABLED` to `false` (or remove the flag). The app will attempt Supabase queries via `src/lib/query.ts` (QueryProvider + useHydration). TanStack Query caches will merge with server data.
- **Migration path**: 
  1. Add Supabase client initialization in `src/app/_layout.tsx` (or a dedicated `src/lib/supabase.ts`).
  2. Replace `useTripStore` / `usePersonalStore` initializations to prefer server data on hydrate, fall back to local persist.
  3. Keep local persist as offline fallback (TanStack Query stale-while-revalidate).
  4. Remove demo seed data loading (`src/data/demo.ts`) or gate it behind `DEMO_MODE_ENABLED`.

## Known Gaps / Open Questions

- **RLS policy granularity**: Current policies are “user in trip” coarse‑grained; finer‑grained (e.g., “can edit this expense”) can be added later.
- **Real‑time subscriptions**: Not yet required for MVP; can add `supabase realtime` listeners for live balance updates.
- **Offline conflict resolution**: If online+offline both modify data, TanStack Query’s `refetchInterval` + local persist handles most cases; edge cases (same expense edited offline+online) need app‑level conflict handling (can be postponed).
- **Budget enforcement**: Backend could enforce `monthly_budget_paise` via RLS or a Supabase function; currently client‑side only.
- **Notification personalization**: Reminder body today hardcodes amounts (₹6,108, ₹534). These should be dynamically computed from `settlements` or `expense_splits` and stored in `reminders.body` at creation.

## Checklist for Backend Integration (post‑MVP)

- [ ] Create Supabase project, get anon key.
- [ ] Run `supabase init` + `0001_init.sql` migrations.
- [ ] Set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` in `.env`.
- [ ] Update `src/app/_layout.tsx` to initialize Supabase client and `QueryProvider`.
- [ ] Modify feature stores (`trips.store.ts`, `personal.store.ts`, `reminders.service.ts`) to prefer server data on hydrate, local persist as fallback.
- [ ] Gate demo seed data behind `DEMO_MODE_ENABLED`.
- [ ] Implement real‑time listeners for balance changes (optional).
- [ ] Test CSV export against real Supabase rows.
- [ ] Sign‑out clears both auth session and local store.
- [ ] Deploy to production Supabase project; update RLS policies for production roles.