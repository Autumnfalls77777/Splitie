-- Splitie Phase 2: shared trips, join codes, email invites, push tokens,
-- and payment reminder delivery.
--
-- This migration is additive. It keeps the legacy trips.members jsonb column
-- for old caches but makes public.trip_members authoritative.
--
-- Apply manually in the Supabase SQL editor after 20261102000000_init.sql.

-- ---------------------------------------------------------------------------
-- 1. Trip and member columns
-- ---------------------------------------------------------------------------
alter table public.trips
  add column if not exists currency text not null default 'INR';

alter table public.trips
  add column if not exists join_code text;

alter table public.trip_members
  add column if not exists claimed_at timestamptz;

-- Member ids are only unique inside a trip. The creator member id is the auth
-- user id, so a user who creates two trips would collide on a global primary
-- key. Scope the key to the trip.
alter table public.trip_members drop constraint if exists trip_members_pkey;
alter table public.trip_members add primary key (trip_id, id);

create index if not exists trip_members_id_idx
  on public.trip_members(id);

create unique index if not exists trip_members_trip_user_uniq
  on public.trip_members(trip_id, user_id)
  where user_id is not null;

-- ---------------------------------------------------------------------------
-- 2. New tables
-- ---------------------------------------------------------------------------
create table if not exists public.trip_invites (
  id uuid primary key default gen_random_uuid(),
  trip_id text not null references public.trips(id) on delete cascade,
  invited_email text not null,
  invited_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'revoked')),
  notified_at timestamptz,
  created_at timestamptz not null default now(),
  responded_at timestamptz
);

create index if not exists trip_invites_trip_idx
  on public.trip_invites(trip_id);
create index if not exists trip_invites_email_idx
  on public.trip_invites(lower(invited_email));
create unique index if not exists trip_invites_pending_uniq
  on public.trip_invites(trip_id, lower(invited_email))
  where status = 'pending';

create table if not exists public.payment_reminders (
  id uuid primary key default gen_random_uuid(),
  trip_id text not null references public.trips(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  amount_paise bigint not null check (amount_paise > 0),
  created_at timestamptz not null default now()
);

create index if not exists payment_reminders_trip_idx
  on public.payment_reminders(trip_id);
create index if not exists payment_reminders_sender_idx
  on public.payment_reminders(sender_id, recipient_id, created_at desc);

create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null unique,
  platform text not null default 'android'
    check (platform in ('android', 'ios')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists push_tokens_user_idx
  on public.push_tokens(user_id);

create table if not exists public.join_code_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  attempted_at timestamptz not null default now()
);

create index if not exists join_code_attempts_user_idx
  on public.join_code_attempts(user_id, attempted_at desc);

create index if not exists trips_created_by_idx
  on public.trips(created_by);

-- ---------------------------------------------------------------------------
-- 3. Helpers
-- ---------------------------------------------------------------------------
create or replace function public.normalize_email(p_email text)
returns text
language sql
immutable
as $$
  select lower(trim(coalesce(p_email, '')));
$$;

/*
 * Google OAuth gives us a verified address. Email/password signups are not
 * confirmed yet, so they must not be allowed to auto-claim an existing name.
 * Relax this when real email confirmation is enabled.
 */
create or replace function public.has_verified_email()
returns boolean
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select coalesce(
    jsonb_exists(
      auth.jwt() -> 'app_metadata' -> 'providers',
      'google'
    ),
    false
  );
$$;

create or replace function public.trip_host_name(p_user_id uuid)
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    nullif(p.name, ''),
    split_part(coalesce(u.email, ''), '@', 1),
    'Host'
  )
  from auth.users u
  left join public.profiles p on p.id = u.id
  where u.id = p_user_id;
$$;

/*
 * 24-letter alphabet, same as src/lib/join-code.ts. I and O are excluded so
 * a code cannot be confused with 1 or 0 when read aloud.
 */
create or replace function public.generate_join_code()
returns text
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  v_candidate text;
  v_attempt integer;
  v_i integer;
begin
  for v_attempt in 1..24 loop
    v_candidate := '';
    for v_i in 1..6 loop
      v_candidate := v_candidate || substr(
        v_alphabet,
        1 + floor(random() * length(v_alphabet))::integer,
        1
      );
    end loop;
    if not exists (select 1 from public.trips where join_code = v_candidate) then
      return v_candidate;
    end if;
  end loop;
  raise exception 'could_not_generate_join_code';
end;
$$;

create or replace function public.record_join_code_attempt()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_recent integer;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  -- Keep the table small without a separate cron job.
  delete from public.join_code_attempts
  where attempted_at < now() - interval '1 day';

  select count(*)::integer into v_recent
  from public.join_code_attempts
  where user_id = auth.uid()
    and attempted_at > now() - interval '10 minutes';

  if v_recent >= 10 then
    raise exception 'too_many_attempts';
  end if;

  insert into public.join_code_attempts (user_id) values (auth.uid());
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Claim logic shared by code joins and invite acceptance
-- ---------------------------------------------------------------------------
create or replace function public.claim_trip_membership(
  p_trip_id text,
  p_user_id uuid,
  p_claim_member_id text default null,
  p_auto_claim_email text default null
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_member public.trip_members;
  v_name text;
  v_email text;
  v_color text;
  v_count integer;
  v_new_id text;
begin
  if p_user_id is null then
    raise exception 'not_authenticated';
  end if;

  -- Idempotent: already a member means there is nothing to claim.
  select * into v_member
  from public.trip_members
  where trip_id = p_trip_id and user_id = p_user_id
  limit 1;
  if found then
    return v_member.id;
  end if;

  -- Verified email wins over whatever row the person picked in the picker.
  if p_auto_claim_email is not null and length(trim(p_auto_claim_email)) > 0 then
    select * into v_member
    from public.trip_members
    where trip_id = p_trip_id
      and user_id is null
      and lower(coalesce(email, '')) = lower(trim(p_auto_claim_email))
    order by created_at
    limit 1
    for update;

    if found then
      update public.trip_members
      set user_id = p_user_id,
          claimed_at = now(),
          is_you = false,
          email = lower(trim(p_auto_claim_email))
      where trip_id = p_trip_id and id = v_member.id;
      return v_member.id;
    end if;
  end if;

  -- Explicitly picked an unclaimed row from the preview.
  if p_claim_member_id is not null and length(trim(p_claim_member_id)) > 0 then
    select * into v_member
    from public.trip_members
    where trip_id = p_trip_id
      and id = trim(p_claim_member_id)
      and user_id is null
    for update;

    if not found then
      raise exception 'claim_unavailable';
    end if;

    update public.trip_members
    set user_id = p_user_id,
        claimed_at = now(),
        is_you = false
    where trip_id = p_trip_id and id = v_member.id;
    return v_member.id;
  end if;

  -- Otherwise create a new member row for this account.
  select lower(u.email)
  into v_email
  from auth.users u
  where u.id = p_user_id;

  select coalesce(
    nullif(p.name, ''),
    split_part(coalesce(u.email, ''), '@', 1),
    'Splitie user'
  )
  into v_name
  from auth.users u
  left join public.profiles p on p.id = u.id
  where u.id = p_user_id;

  select count(*)::integer into v_count
  from public.trip_members
  where trip_id = p_trip_id;

  v_color := case v_count % 6
    when 0 then '#C9F25B'
    when 1 then '#FFD166'
    when 2 then '#8ECAE6'
    when 3 then '#FF8FAB'
    when 4 then '#B5A6FF'
    else '#F4A261'
  end;

  v_new_id := 'mem_' || replace(gen_random_uuid()::text, '-', '');

  insert into public.trip_members (
    id, trip_id, user_id, display_name, email, color, is_you, claimed_at
  )
  values (
    v_new_id,
    p_trip_id,
    p_user_id,
    coalesce(v_name, 'Splitie user'),
    v_email,
    v_color,
    false,
    now()
  );

  return v_new_id;
exception
  when unique_violation then
    -- A concurrent join won the race. Return that membership if it is ours.
    select * into v_member
    from public.trip_members
    where trip_id = p_trip_id and user_id = p_user_id
    limit 1;
    if found then
      return v_member.id;
    end if;
    raise exception 'claim_unavailable';
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Trip triggers
-- ---------------------------------------------------------------------------
create or replace function public.set_trip_join_code()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.join_code is null or length(trim(new.join_code)) = 0 then
    new.join_code := public.generate_join_code();
  end if;
  return new;
end;
$$;

create or replace function public.create_trip_owner_member()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_name text;
  v_email text;
begin
  select coalesce(
    nullif(p.name, ''),
    split_part(coalesce(u.email, ''), '@', 1),
    'You'
  ),
  lower(u.email)
  into v_name, v_email
  from auth.users u
  left join public.profiles p on p.id = u.id
  where u.id = new.created_by;

  -- The creator member id matches the id the app already uses locally (the
  -- auth user id), so existing expenses keep pointing at the right person.
  insert into public.trip_members (
    id, trip_id, user_id, display_name, email, color, is_you, claimed_at
  )
  values (
    new.created_by::text,
    new.id,
    new.created_by,
    coalesce(v_name, 'You'),
    v_email,
    '#C9F25B',
    true,
    now()
  )
  on conflict (trip_id, id) do nothing;

  return new;
end;
$$;

create or replace function public.protect_trip_owner_fields()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.created_by is distinct from old.created_by then
    raise exception 'host_only';
  end if;

  if new.join_code is distinct from old.join_code and not public.owns_trip(old.id) then
    raise exception 'host_only';
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. Backfill before the protect trigger exists
-- ---------------------------------------------------------------------------
-- Link an existing creator member row (where the local id was the auth id)
-- before inserting a fresh one.
update public.trip_members m
set user_id = t.created_by,
    claimed_at = coalesce(m.claimed_at, now()),
    is_you = false
from public.trips t
where m.trip_id = t.id
  and m.id = t.created_by::text
  and m.user_id is null
  and not exists (
    select 1
    from public.trip_members other
    where other.trip_id = t.id
      and other.user_id = t.created_by
      and other.id <> m.id
  );

insert into public.trip_members (
  id, trip_id, user_id, display_name, email, color, is_you, claimed_at
)
select
  t.created_by::text,
  t.id,
  t.created_by,
  coalesce(
    nullif(p.name, ''),
    split_part(coalesce(u.email, ''), '@', 1),
    'You'
  ),
  lower(u.email),
  '#C9F25B',
  true,
  now()
from public.trips t
join auth.users u on u.id = t.created_by
left join public.profiles p on p.id = t.created_by
where not exists (
  select 1
  from public.trip_members m
  where m.trip_id = t.id and m.user_id = t.created_by
)
on conflict (trip_id, id) do nothing;

-- Give every existing trip a code. Separate statements so each generated code
-- sees the codes assigned earlier in the loop.
do $$
declare
  v_trip_id text;
begin
  for v_trip_id in
    select id from public.trips where join_code is null
  loop
    update public.trips
    set join_code = public.generate_join_code()
    where id = v_trip_id;
  end loop;
end;
$$;

create unique index if not exists trips_join_code_key
  on public.trips(join_code)
  where join_code is not null;

-- ---------------------------------------------------------------------------
-- 7. Trip triggers (created after backfill)
-- ---------------------------------------------------------------------------
drop trigger if exists set_trip_join_code on public.trips;
create trigger set_trip_join_code
  before insert on public.trips
  for each row execute function public.set_trip_join_code();

drop trigger if exists create_trip_owner_member on public.trips;
create trigger create_trip_owner_member
  after insert on public.trips
  for each row execute function public.create_trip_owner_member();

drop trigger if exists protect_trip_owner_fields on public.trips;
create trigger protect_trip_owner_fields
  before update on public.trips
  for each row execute function public.protect_trip_owner_fields();

-- ---------------------------------------------------------------------------
-- 8. Row level security
-- ---------------------------------------------------------------------------
alter table public.trip_invites enable row level security;
alter table public.payment_reminders enable row level security;
alter table public.push_tokens enable row level security;
alter table public.join_code_attempts enable row level security;

-- Only the host can delete a trip.
drop policy if exists "trips_delete_member" on public.trips;
drop policy if exists "trips_delete_host" on public.trips;
create policy "trips_delete_host" on public.trips
  for delete to authenticated
  using (created_by = auth.uid());

-- The client may only add name-only members. Real memberships are created by
-- the SECURITY DEFINER RPCs above.
drop policy if exists "trip_members_insert_member" on public.trip_members;
create policy "trip_members_insert_member" on public.trip_members
  for insert to authenticated
  with check (
    user_id is null
    and is_you = false
    and (public.owns_trip(trip_id) or public.is_trip_member(trip_id))
  );

-- The host manages every row; a member can only edit or delete their own row
-- (leave the trip).
drop policy if exists "trip_members_update_member" on public.trip_members;
create policy "trip_members_update_member" on public.trip_members
  for update to authenticated
  using (public.owns_trip(trip_id) or user_id = auth.uid())
  with check (
    (public.owns_trip(trip_id) or user_id = auth.uid())
    and (public.owns_trip(trip_id) or public.is_trip_member(trip_id))
  );

drop policy if exists "trip_members_delete_member" on public.trip_members;
create policy "trip_members_delete_member" on public.trip_members
  for delete to authenticated
  using (public.owns_trip(trip_id) or user_id = auth.uid());

-- Invites are readable by the people in the trip. Writes go through RPCs.
drop policy if exists "trip_invites_select_member" on public.trip_invites;
create policy "trip_invites_select_member" on public.trip_invites
  for select to authenticated
  using (
    invited_by = auth.uid()
    or public.owns_trip(trip_id)
    or public.is_trip_member(trip_id)
  );

-- Senders can read their own reminder history to render the cooldown.
drop policy if exists "payment_reminders_select_sender" on public.payment_reminders;
create policy "payment_reminders_select_sender" on public.payment_reminders
  for select to authenticated
  using (sender_id = auth.uid());

drop policy if exists "push_tokens_select_own" on public.push_tokens;
create policy "push_tokens_select_own" on public.push_tokens
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "push_tokens_insert_own" on public.push_tokens;
create policy "push_tokens_insert_own" on public.push_tokens
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "push_tokens_update_own" on public.push_tokens;
create policy "push_tokens_update_own" on public.push_tokens
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "push_tokens_delete_own" on public.push_tokens;
create policy "push_tokens_delete_own" on public.push_tokens
  for delete to authenticated
  using (user_id = auth.uid());

revoke all on public.trip_invites from anon, authenticated;
grant select on public.trip_invites to authenticated;

revoke all on public.payment_reminders from anon, authenticated;
grant select on public.payment_reminders to authenticated;

revoke all on public.push_tokens from anon, authenticated;
grant select, insert, update, delete on public.push_tokens to authenticated;

revoke all on public.join_code_attempts from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 9. Client RPCs
-- ---------------------------------------------------------------------------
create or replace function public.preview_trip_by_code(p_code text)
returns table (
  trip_id text,
  trip_name text,
  host_name text,
  member_count integer,
  unclaimed_members jsonb,
  already_member boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_code text := upper(trim(coalesce(p_code, '')));
  v_trip public.trips;
  v_count integer;
  v_already boolean;
  v_unclaimed jsonb;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  perform public.record_join_code_attempt();

  if v_code !~ '^[A-HJ-NP-Z]{6}$' then
    return;
  end if;

  select * into v_trip
  from public.trips
  where join_code = v_code;
  if not found then
    return;
  end if;

  select count(*)::integer into v_count
  from public.trip_members
  where trip_members.trip_id = v_trip.id;

  select exists (
    select 1
    from public.trip_members
    where trip_members.trip_id = v_trip.id
      and trip_members.user_id = v_uid
  ) into v_already;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', m.id,
        'display_name', m.display_name,
        'color', m.color
      )
      order by m.created_at
    ),
    '[]'::jsonb
  )
  into v_unclaimed
  from public.trip_members m
  where m.trip_id = v_trip.id
    and m.user_id is null;

  return query
  select
    v_trip.id,
    v_trip.name,
    coalesce(public.trip_host_name(v_trip.created_by), 'Host'),
    v_count,
    v_unclaimed,
    v_already;
end;
$$;

create or replace function public.join_trip_by_code(
  p_code text,
  p_claim_member_id text default null
)
returns table (
  trip_id text,
  trip_name text,
  host_name text,
  already_member boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_code text := upper(trim(coalesce(p_code, '')));
  v_trip public.trips;
  v_email text;
  v_already boolean;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  perform public.record_join_code_attempt();

  if v_code !~ '^[A-HJ-NP-Z]{6}$' then
    return;
  end if;

  select * into v_trip
  from public.trips
  where join_code = v_code;
  if not found then
    return;
  end if;

  select exists (
    select 1
    from public.trip_members
    where trip_members.trip_id = v_trip.id
      and trip_members.user_id = v_uid
  ) into v_already;

  select lower(u.email)
  into v_email
  from auth.users u
  where u.id = v_uid;

  perform public.claim_trip_membership(
    v_trip.id,
    v_uid,
    p_claim_member_id,
    case
      when public.has_verified_email() then nullif(v_email, '')
      else null
    end
  );

  return query
  select
    v_trip.id,
    v_trip.name,
    coalesce(public.trip_host_name(v_trip.created_by), 'Host'),
    v_already;
end;
$$;

create or replace function public.get_my_pending_invites()
returns table (
  invite_id uuid,
  trip_id text,
  trip_name text,
  host_name text,
  member_count integer,
  start_date date,
  end_date date,
  created_at timestamptz,
  unclaimed_members jsonb
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  if not public.has_verified_email() then
    return;
  end if;

  select lower(u.email)
  into v_email
  from auth.users u
  where u.id = v_uid;

  if v_email is null or v_email = '' then
    return;
  end if;

  return query
  select
    i.id,
    t.id,
    t.name,
    coalesce(public.trip_host_name(t.created_by), 'Host'),
    (
      select count(*)::integer
      from public.trip_members m
      where m.trip_id = t.id
    ),
    t.start_date,
    t.end_date,
    i.created_at,
    (
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id', m.id,
            'display_name', m.display_name,
            'color', m.color
          )
          order by m.created_at
        ),
        '[]'::jsonb
      )
      from public.trip_members m
      where m.trip_id = t.id
        and m.user_id is null
    )
  from public.trip_invites i
  join public.trips t on t.id = i.trip_id
  where i.status = 'pending'
    and lower(i.invited_email) = v_email
    and not exists (
      select 1
      from public.trip_members m
      where m.trip_id = t.id
        and m.user_id = v_uid
    )
  order by i.created_at desc
  limit 20;
end;
$$;

create or replace function public.respond_to_invite(
  p_invite_id uuid,
  p_accept boolean,
  p_claim_member_id text default null
)
returns table (
  trip_id text,
  trip_name text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_invite public.trip_invites;
  v_trip_name text;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  if not public.has_verified_email() then
    raise exception 'verified_email_required';
  end if;

  select lower(u.email)
  into v_email
  from auth.users u
  where u.id = v_uid;

  if v_email is null or v_email = '' then
    raise exception 'invite_unavailable';
  end if;

  select * into v_invite
  from public.trip_invites
  where id = p_invite_id
    and status = 'pending'
    and lower(invited_email) = v_email
  for update;

  if not found then
    raise exception 'invite_unavailable';
  end if;

  select name into v_trip_name
  from public.trips
  where id = v_invite.trip_id;

  if p_accept then
    perform public.claim_trip_membership(
      v_invite.trip_id,
      v_uid,
      p_claim_member_id,
      v_email
    );

    update public.trip_invites
    set status = 'accepted', responded_at = now()
    where id = v_invite.id;
  else
    update public.trip_invites
    set status = 'declined', responded_at = now()
    where id = v_invite.id;
  end if;

  return query
  select v_invite.trip_id, v_trip_name;
end;
$$;

create or replace function public.invite_to_trip(
  p_trip_id text,
  p_email text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_email text := public.normalize_email(p_email);
  v_invite_id uuid;
  v_recent integer;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  if not public.has_verified_email() then
    raise exception 'verified_email_required';
  end if;

  if not (public.owns_trip(p_trip_id) or public.is_trip_member(p_trip_id)) then
    raise exception 'not_member';
  end if;

  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'invalid_email';
  end if;

  select count(*)::integer into v_recent
  from public.trip_invites
  where invited_by = v_uid
    and created_at > now() - interval '1 hour';

  if v_recent >= 20 then
    raise exception 'rate_limited';
  end if;

  -- Do not store an invite for someone already linked to the trip. The app
  -- still shows the generic success message.
  if exists (
    select 1
    from public.trip_members m
    join auth.users u on u.id = m.user_id
    where m.trip_id = p_trip_id
      and lower(coalesce(u.email, '')) = v_email
  ) then
    return null;
  end if;

  select id into v_invite_id
  from public.trip_invites
  where trip_id = p_trip_id
    and invited_email = v_email
    and status = 'pending'
  limit 1;

  if found then
    return v_invite_id;
  end if;

  begin
    insert into public.trip_invites (trip_id, invited_email, invited_by)
    values (p_trip_id, v_email, v_uid)
    returning id into v_invite_id;
  exception
    when unique_violation then
      select id into v_invite_id
      from public.trip_invites
      where trip_id = p_trip_id
        and invited_email = v_email
        and status = 'pending'
      limit 1;
  end;

  return v_invite_id;
end;
$$;

create or replace function public.cancel_invite(p_invite_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_invite public.trip_invites;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select * into v_invite
  from public.trip_invites
  where id = p_invite_id
    and status = 'pending'
  for update;

  if not found then
    raise exception 'invite_unavailable';
  end if;

  if v_invite.invited_by <> v_uid and not public.owns_trip(v_invite.trip_id) then
    raise exception 'host_only';
  end if;

  update public.trip_invites
  set status = 'revoked', responded_at = now()
  where id = p_invite_id;
end;
$$;

create or replace function public.regenerate_join_code(p_trip_id text)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_code text;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  if not public.owns_trip(p_trip_id) then
    raise exception 'host_only';
  end if;

  v_code := public.generate_join_code();

  update public.trips
  set join_code = v_code
  where id = p_trip_id;

  return v_code;
end;
$$;

create or replace function public.register_push_token(
  p_token text,
  p_platform text default 'android'
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_platform text := lower(coalesce(p_platform, 'android'));
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  if p_token is null or length(trim(p_token)) = 0 then
    raise exception 'invalid_token';
  end if;

  if v_platform not in ('android', 'ios') then
    v_platform := 'android';
  end if;

  insert into public.push_tokens (user_id, token, platform)
  values (auth.uid(), trim(p_token), v_platform)
  on conflict (token) do update
    set user_id = excluded.user_id,
        platform = excluded.platform,
        updated_at = now();
end;
$$;

create or replace function public.unregister_push_token(p_token text default null)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    return;
  end if;

  if p_token is null or length(trim(p_token)) = 0 then
    delete from public.push_tokens where user_id = auth.uid();
  else
    delete from public.push_tokens
    where user_id = auth.uid()
      and token = trim(p_token);
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 10. Function grants
-- ---------------------------------------------------------------------------
revoke execute on function public.normalize_email(text) from public, anon, authenticated;
revoke execute on function public.has_verified_email() from public, anon, authenticated;
revoke execute on function public.trip_host_name(uuid) from public, anon, authenticated;
revoke execute on function public.generate_join_code() from public, anon, authenticated;
revoke execute on function public.record_join_code_attempt() from public, anon, authenticated;
revoke execute on function public.claim_trip_membership(text, uuid, text, text) from public, anon, authenticated;

revoke execute on function public.set_trip_join_code() from public, anon, authenticated;
revoke execute on function public.create_trip_owner_member() from public, anon, authenticated;
revoke execute on function public.protect_trip_owner_fields() from public, anon, authenticated;

revoke execute on function public.preview_trip_by_code(text) from public, anon;
grant execute on function public.preview_trip_by_code(text) to authenticated;

revoke execute on function public.join_trip_by_code(text, text) from public, anon;
grant execute on function public.join_trip_by_code(text, text) to authenticated;

revoke execute on function public.get_my_pending_invites() from public, anon;
grant execute on function public.get_my_pending_invites() to authenticated;

revoke execute on function public.respond_to_invite(uuid, boolean, text) from public, anon;
grant execute on function public.respond_to_invite(uuid, boolean, text) to authenticated;

revoke execute on function public.invite_to_trip(text, text) from public, anon;
grant execute on function public.invite_to_trip(text, text) to authenticated;

revoke execute on function public.cancel_invite(uuid) from public, anon;
grant execute on function public.cancel_invite(uuid) to authenticated;

revoke execute on function public.regenerate_join_code(text) from public, anon;
grant execute on function public.regenerate_join_code(text) to authenticated;

revoke execute on function public.register_push_token(text, text) from public, anon;
grant execute on function public.register_push_token(text, text) to authenticated;

revoke execute on function public.unregister_push_token(text) from public, anon;
grant execute on function public.unregister_push_token(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 11. Service-role email lookup + reminder cooldown
-- ---------------------------------------------------------------------------
create or replace function public.find_user_id_by_email(p_email text)
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select u.id from auth.users u
  where lower(u.email) = lower(trim(p_email))
  limit 1;
$$;

revoke execute on function public.find_user_id_by_email(text) from public, anon, authenticated;
grant execute on function public.find_user_id_by_email(text) to service_role;

create or replace function public.enforce_reminder_cooldown()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform pg_advisory_xact_lock(
    hashtext(new.trip_id || ':' || new.sender_id::text || ':' || new.recipient_id::text)
  );
  if exists (
    select 1 from public.payment_reminders r
    where r.trip_id = new.trip_id
      and r.sender_id = new.sender_id
      and r.recipient_id = new.recipient_id
      and r.created_at > now() - interval '6 hours'
  ) then
    raise exception 'reminder_cooldown';
  end if;
  return new;
end;
$$;

revoke execute on function public.enforce_reminder_cooldown() from public, anon, authenticated;

drop trigger if exists enforce_reminder_cooldown on public.payment_reminders;
create trigger enforce_reminder_cooldown
  before insert on public.payment_reminders
  for each row execute function public.enforce_reminder_cooldown();
