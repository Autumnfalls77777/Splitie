-- Splitie production schema
-- All app-facing IDs are text so the offline SQLite cache and the cloud can
-- share the same IDs without a translation layer. Auth-owned rows use uuid.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  email text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- User settings (preferences + personal budget)
-- ---------------------------------------------------------------------------
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  theme_mode text not null default 'system' check (theme_mode in ('system', 'light', 'dark')),
  currency text not null default 'INR',
  haptics_enabled boolean not null default true,
  notifications_enabled boolean not null default true,
  reminder_lead_days integer not null default 3 check (reminder_lead_days between 1 and 14),
  monthly_budget_paise bigint not null default 3000000 check (monthly_budget_paise >= 0),
  compact_numbers boolean not null default false,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Trips
-- ---------------------------------------------------------------------------
create table if not exists public.trips (
  id text primary key,
  name text not null,
  destination text not null default '',
  emoji text not null default '✈️',
  cover text not null default 'lime',
  start_date date not null,
  end_date date not null,
  budget_paise bigint check (budget_paise is null or budget_paise >= 0),
  members jsonb not null default '[]'::jsonb,
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived boolean not null default false
);

create table if not exists public.trip_members (
  id text primary key,
  trip_id text not null references public.trips(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  display_name text not null,
  email text,
  color text not null default '#C9F25B',
  is_you boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.expenses (
  id text primary key,
  trip_id text not null references public.trips(id) on delete cascade,
  title text not null,
  amount_paise bigint not null check (amount_paise > 0),
  category text not null default 'other',
  paid_by text not null,
  date date not null,
  split_type text not null default 'equal',
  splits jsonb not null default '[]'::jsonb,
  note text,
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.settlements (
  id text primary key,
  trip_id text not null references public.trips(id) on delete cascade,
  from_member_id text not null,
  to_member_id text not null,
  amount_paise bigint not null check (amount_paise > 0),
  date date not null,
  note text,
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Personal expenses + reminders
-- ---------------------------------------------------------------------------
create table if not exists public.personal_expenses (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  amount_paise bigint not null check (amount_paise > 0),
  category text not null default 'other',
  date date not null,
  note text,
  recurrence text not null default 'none',
  payment_method text not null default 'upi',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reminders (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  type text not null default 'personal',
  title text not null,
  body text not null default '',
  due_date date not null,
  amount_paise bigint,
  trip_id text references public.trips(id) on delete cascade,
  from_member_id text,
  to_member_id text,
  read boolean not null default false,
  completed boolean not null default false,
  notification_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
create index if not exists trip_members_trip_idx on public.trip_members(trip_id);
create index if not exists trip_members_user_idx on public.trip_members(user_id);
create index if not exists expenses_trip_idx on public.expenses(trip_id);
create index if not exists expenses_date_idx on public.expenses(date);
create index if not exists settlements_trip_idx on public.settlements(trip_id);
create index if not exists personal_expenses_user_date_idx
  on public.personal_expenses(user_id, date desc);
create index if not exists reminders_user_due_idx
  on public.reminders(user_id, due_date);

-- ---------------------------------------------------------------------------
-- Membership helpers (security definer avoids recursive RLS evaluation)
-- ---------------------------------------------------------------------------
create or replace function public.is_trip_member(p_trip_id text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.trip_members
    where trip_id = p_trip_id
      and user_id = auth.uid()
  );
$$;

create or replace function public.owns_trip(p_trip_id text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.trips
    where id = p_trip_id
      and created_by = auth.uid()
  );
$$;

grant execute on function public.is_trip_member(text) to authenticated;
grant execute on function public.owns_trip(text) to authenticated;

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles', 'user_settings', 'trips', 'trip_members',
    'expenses', 'settlements', 'personal_expenses', 'reminders'
  ]
  loop
    execute format('drop trigger if exists set_updated_at on public.%I', table_name);
    execute format(
      'create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      table_name
    );
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- New auth user bootstrap
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, avatar_url)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data->>'name', ''),
      nullif(new.raw_user_meta_data->>'full_name', ''),
      split_part(coalesce(new.email, ''), '@', 1),
      'Splitie user'
    ),
    new.email,
    coalesce(
      nullif(new.raw_user_meta_data->>'avatar_url', ''),
      nullif(new.raw_user_meta_data->>'picture', '')
    )
  )
  on conflict (id) do nothing;

  insert into public.user_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;
alter table public.trips enable row level security;
alter table public.trip_members enable row level security;
alter table public.expenses enable row level security;
alter table public.settlements enable row level security;
alter table public.personal_expenses enable row level security;
alter table public.reminders enable row level security;

-- Profiles: own row only
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select to authenticated using (id = auth.uid());
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check (id = auth.uid());
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Settings: own row only
drop policy if exists "user_settings_select_own" on public.user_settings;
create policy "user_settings_select_own" on public.user_settings
  for select to authenticated using (user_id = auth.uid());
drop policy if exists "user_settings_insert_own" on public.user_settings;
create policy "user_settings_insert_own" on public.user_settings
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "user_settings_update_own" on public.user_settings;
create policy "user_settings_update_own" on public.user_settings
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Trips: creator or member
drop policy if exists "trips_select_member" on public.trips;
create policy "trips_select_member" on public.trips
  for select to authenticated
  using (created_by = auth.uid() or public.is_trip_member(id));

drop policy if exists "trips_insert_creator" on public.trips;
create policy "trips_insert_creator" on public.trips
  for insert to authenticated with check (created_by = auth.uid());

drop policy if exists "trips_update_member" on public.trips;
create policy "trips_update_member" on public.trips
  for update to authenticated
  using (created_by = auth.uid() or public.is_trip_member(id))
  with check (created_by = auth.uid() or public.is_trip_member(id));

drop policy if exists "trips_delete_member" on public.trips;
create policy "trips_delete_member" on public.trips
  for delete to authenticated
  using (created_by = auth.uid() or public.is_trip_member(id));

-- Trip members: visible to everyone in the trip
drop policy if exists "trip_members_select_member" on public.trip_members;
create policy "trip_members_select_member" on public.trip_members
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_trip_member(trip_id)
    or public.owns_trip(trip_id)
  );

drop policy if exists "trip_members_insert_member" on public.trip_members;
create policy "trip_members_insert_member" on public.trip_members
  for insert to authenticated
  with check (public.owns_trip(trip_id) or public.is_trip_member(trip_id));

drop policy if exists "trip_members_update_member" on public.trip_members;
create policy "trip_members_update_member" on public.trip_members
  for update to authenticated
  using (public.owns_trip(trip_id) or public.is_trip_member(trip_id))
  with check (public.owns_trip(trip_id) or public.is_trip_member(trip_id));

drop policy if exists "trip_members_delete_member" on public.trip_members;
create policy "trip_members_delete_member" on public.trip_members
  for delete to authenticated
  using (public.owns_trip(trip_id) or public.is_trip_member(trip_id));

-- Expenses and settlements: trip members only
drop policy if exists "expenses_select_member" on public.expenses;
create policy "expenses_select_member" on public.expenses
  for select to authenticated using (public.is_trip_member(trip_id));
drop policy if exists "expenses_insert_member" on public.expenses;
create policy "expenses_insert_member" on public.expenses
  for insert to authenticated with check (public.is_trip_member(trip_id));
drop policy if exists "expenses_update_member" on public.expenses;
create policy "expenses_update_member" on public.expenses
  for update to authenticated
  using (public.is_trip_member(trip_id))
  with check (public.is_trip_member(trip_id));
drop policy if exists "expenses_delete_member" on public.expenses;
create policy "expenses_delete_member" on public.expenses
  for delete to authenticated using (public.is_trip_member(trip_id));

drop policy if exists "settlements_select_member" on public.settlements;
create policy "settlements_select_member" on public.settlements
  for select to authenticated using (public.is_trip_member(trip_id));
drop policy if exists "settlements_insert_member" on public.settlements;
create policy "settlements_insert_member" on public.settlements
  for insert to authenticated with check (public.is_trip_member(trip_id));
drop policy if exists "settlements_update_member" on public.settlements;
create policy "settlements_update_member" on public.settlements
  for update to authenticated
  using (public.is_trip_member(trip_id))
  with check (public.is_trip_member(trip_id));
drop policy if exists "settlements_delete_member" on public.settlements;
create policy "settlements_delete_member" on public.settlements
  for delete to authenticated using (public.is_trip_member(trip_id));

-- Personal data: own rows only
drop policy if exists "personal_expenses_select_own" on public.personal_expenses;
create policy "personal_expenses_select_own" on public.personal_expenses
  for select to authenticated using (user_id = auth.uid());
drop policy if exists "personal_expenses_insert_own" on public.personal_expenses;
create policy "personal_expenses_insert_own" on public.personal_expenses
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "personal_expenses_update_own" on public.personal_expenses;
create policy "personal_expenses_update_own" on public.personal_expenses
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "personal_expenses_delete_own" on public.personal_expenses;
create policy "personal_expenses_delete_own" on public.personal_expenses
  for delete to authenticated using (user_id = auth.uid());

drop policy if exists "reminders_select_own" on public.reminders;
create policy "reminders_select_own" on public.reminders
  for select to authenticated using (user_id = auth.uid());
drop policy if exists "reminders_insert_own" on public.reminders;
create policy "reminders_insert_own" on public.reminders
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "reminders_update_own" on public.reminders;
create policy "reminders_update_own" on public.reminders
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "reminders_delete_own" on public.reminders;
create policy "reminders_delete_own" on public.reminders
  for delete to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- API grants
-- ---------------------------------------------------------------------------
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.user_settings to authenticated;
grant select, insert, update, delete on public.trips to authenticated;
grant select, insert, update, delete on public.trip_members to authenticated;
grant select, insert, update, delete on public.expenses to authenticated;
grant select, insert, update, delete on public.settlements to authenticated;
grant select, insert, update, delete on public.personal_expenses to authenticated;
grant select, insert, update, delete on public.reminders to authenticated;
