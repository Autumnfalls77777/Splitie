-- Only the host may update a trip row. Members could previously update any
-- column, including created_by and join_code, directly through the API.
drop policy if exists "trips_update_member" on public.trips;
drop policy if exists "trips_update_host" on public.trips;
create policy "trips_update_host" on public.trips
  for update to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());
