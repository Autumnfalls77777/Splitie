begin;

create temp table throttle_result (result text) on commit drop;
grant insert, select on throttle_result to authenticated;

-- Pick the first auth user so this file can be pasted as-is.
do $$
declare
  v_uid uuid;
begin
  select id into v_uid from auth.users order by created_at limit 1;
  if v_uid is null then
    raise exception 'No auth.users row found. Sign up once, then rerun this file.';
  end if;

  -- Start from a clean throttle window for that user.
  delete from public.join_code_attempts where user_id = v_uid;

  perform set_config(
    'request.jwt.claims',
    json_build_object(
      'sub', v_uid,
      'role', 'authenticated',
      'app_metadata', json_build_object('providers', json_build_array('google'))
    )::text,
    true
  );
  perform set_config('request.jwt.claim.sub', v_uid::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
end $$;

set local role authenticated;

do $$
declare
  i int;
  v_msg text;
begin
  for i in 1..10 loop
    perform count(*) from public.preview_trip_by_code('AAAAAA');
  end loop;

  begin
    perform count(*) from public.preview_trip_by_code('AAAAAA');
    v_msg := 'FAIL: 11th attempt succeeded, throttle not working';
  exception when others then
    if sqlerrm = 'too_many_attempts' then
      v_msg := 'PASS: throttle works';
    else
      v_msg := 'FAIL: unexpected error: ' || sqlerrm;
    end if;
  end;

  insert into throttle_result values (v_msg);
end $$;

select result from throttle_result;

rollback;
