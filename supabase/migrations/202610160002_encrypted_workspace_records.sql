alter table public.pos_workspaces
  add column if not exists records_projected_at timestamptz;

create table if not exists public.pos_workspace_records (
  workspace_owner_id uuid not null references public.pos_workspaces(owner_id) on delete cascade,
  record_type text not null check (record_type in (
    'mine_order', 'product', 'live_session', 'host', 'daily_ledger',
    'audit_log', 'deleted_host', 'deleted_record'
  )),
  record_id text not null check (length(record_id) between 1 and 256),
  payload jsonb not null check (
    jsonb_typeof(payload) = 'object'
    and payload->>'format' = 'clothes-mania-server-encrypted'
    and payload->>'encrypted' = 'true'
    and payload->>'version' = '2'
    and payload->>'algorithm' = 'AES-GCM-256'
    and coalesce(payload->>'iv', '') <> ''
    and coalesce(payload->>'ciphertext', '') <> ''
  ),
  updated_at timestamptz not null,
  primary key (workspace_owner_id, record_type, record_id)
);

create index if not exists pos_workspace_records_owner_type_updated_idx
  on public.pos_workspace_records (workspace_owner_id, record_type, updated_at desc);

alter table public.pos_workspace_records enable row level security;

drop policy if exists "Workspace admins can read encrypted POS records" on public.pos_workspace_records;
create policy "Workspace admins can read encrypted POS records"
  on public.pos_workspace_records for select to authenticated
  using (workspace_owner_id = public.current_pos_workspace_owner());

revoke all on public.pos_workspace_records from public, anon, authenticated;
grant select on public.pos_workspace_records to authenticated;

create or replace function public.replace_pos_workspace_records_for_owner(
  p_workspace_owner_id uuid,
  p_records jsonb,
  p_updated_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if p_records is null or jsonb_typeof(p_records) <> 'array' then
    raise exception 'Encrypted workspace records must be an array';
  end if;
  if jsonb_array_length(p_records) > 25000 then
    raise exception 'Workspace record projection exceeds the record limit';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(p_records) as item(value)
    where jsonb_typeof(item.value) <> 'object'
       or item.value->>'recordType' not in (
         'mine_order', 'product', 'live_session', 'host', 'daily_ledger',
         'audit_log', 'deleted_host', 'deleted_record'
       )
       or coalesce(item.value->>'recordId', '') = ''
       or length(item.value->>'recordId') > 256
       or jsonb_typeof(item.value->'payload') <> 'object'
       or item.value->'payload'->>'format' is distinct from 'clothes-mania-server-encrypted'
       or item.value->'payload'->>'encrypted' is distinct from 'true'
       or item.value->'payload'->>'version' is distinct from '2'
       or item.value->'payload'->>'algorithm' is distinct from 'AES-GCM-256'
       or coalesce(item.value->'payload'->>'iv', '') = ''
       or coalesce(item.value->'payload'->>'ciphertext', '') = ''
  ) then
    raise exception 'Workspace record projection contains invalid or unencrypted data';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(p_records) as item(value)
    group by item.value->>'recordType', item.value->>'recordId'
    having count(*) > 1
  ) then
    raise exception 'Workspace record projection contains duplicate record IDs';
  end if;

  insert into public.pos_workspace_records (
    workspace_owner_id, record_type, record_id, payload, updated_at
  )
  select
    p_workspace_owner_id,
    item.value->>'recordType',
    item.value->>'recordId',
    item.value->'payload',
    p_updated_at
  from jsonb_array_elements(p_records) as item(value)
  on conflict (workspace_owner_id, record_type, record_id) do update
    set payload = excluded.payload,
        updated_at = excluded.updated_at;

  delete from public.pos_workspace_records existing
  where existing.workspace_owner_id = p_workspace_owner_id
    and not exists (
      select 1
      from jsonb_array_elements(p_records) as item(value)
      where item.value->>'recordType' = existing.record_type
        and item.value->>'recordId' = existing.record_id
    );
end;
$$;

create or replace function public.save_pos_workspace_snapshot_and_records(
  p_snapshot jsonb,
  p_records jsonb,
  p_expected_updated_at timestamptz
)
returns timestamptz
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_workspace_owner_id uuid := public.current_pos_workspace_owner();
  v_existing_updated_at timestamptz;
  v_updated_at timestamptz := clock_timestamp();
begin
  if v_workspace_owner_id is null then raise exception 'Workspace membership required'; end if;
  if p_snapshot is null
     or jsonb_typeof(p_snapshot) <> 'object'
     or p_snapshot->>'format' is distinct from 'clothes-mania-server-encrypted'
     or p_snapshot->>'encrypted' is distinct from 'true'
     or p_snapshot->>'version' is distinct from '2'
     or p_snapshot->>'algorithm' is distinct from 'AES-GCM-256'
     or coalesce(p_snapshot->>'iv', '') = ''
     or coalesce(p_snapshot->>'ciphertext', '') = '' then
    raise exception 'Workspace data must be encrypted by the workspace sync service';
  end if;

  select updated_at into v_existing_updated_at
  from public.pos_workspaces
  where owner_id = v_workspace_owner_id
  for update;
  if not found then raise exception 'Shared workspace was not initialized'; end if;
  if p_expected_updated_at is null or p_expected_updated_at is distinct from v_existing_updated_at then
    raise exception 'Shared workspace changed on another device; refresh and resolve the conflict' using errcode = '40001';
  end if;

  update public.pos_workspaces
  set snapshot = p_snapshot,
      updated_at = v_updated_at,
      records_projected_at = v_updated_at
  where owner_id = v_workspace_owner_id;

  perform public.replace_pos_workspace_records_for_owner(v_workspace_owner_id, p_records, v_updated_at);
  return v_updated_at;
end;
$$;

create or replace function public.project_pos_workspace_records(
  p_records jsonb,
  p_expected_updated_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_workspace_owner_id uuid := public.current_pos_workspace_owner();
  v_existing_updated_at timestamptz;
begin
  if v_workspace_owner_id is null then raise exception 'Workspace membership required'; end if;
  select updated_at into v_existing_updated_at
  from public.pos_workspaces
  where owner_id = v_workspace_owner_id
  for update;
  if not found then raise exception 'Shared workspace was not initialized'; end if;
  if p_expected_updated_at is null or p_expected_updated_at is distinct from v_existing_updated_at then
    raise exception 'Shared workspace changed during record projection; retry sync' using errcode = '40001';
  end if;

  perform public.replace_pos_workspace_records_for_owner(v_workspace_owner_id, p_records, v_existing_updated_at);
  update public.pos_workspaces
  set records_projected_at = v_existing_updated_at
  where owner_id = v_workspace_owner_id;
end;
$$;

drop function if exists public.get_pos_workspace_snapshot();
create function public.get_pos_workspace_snapshot()
returns table(
  workspace_owner_id uuid,
  snapshot jsonb,
  updated_at timestamptz,
  records_projected_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_workspace_owner_id uuid := public.current_pos_workspace_owner();
begin
  if v_workspace_owner_id is null then raise exception 'Workspace membership required'; end if;
  return query
  select w.owner_id, w.snapshot, w.updated_at, w.records_projected_at
  from public.pos_workspaces w
  where w.owner_id = v_workspace_owner_id;
end;
$$;

revoke all on function public.replace_pos_workspace_records_for_owner(uuid, jsonb, timestamptz) from public, anon, authenticated;
revoke all on function public.save_pos_workspace_snapshot_and_records(jsonb, jsonb, timestamptz) from public, anon;
revoke all on function public.project_pos_workspace_records(jsonb, timestamptz) from public, anon;
revoke all on function public.get_pos_workspace_snapshot() from public, anon;
grant execute on function public.save_pos_workspace_snapshot_and_records(jsonb, jsonb, timestamptz) to authenticated;
grant execute on function public.project_pos_workspace_records(jsonb, timestamptz) to authenticated;
grant execute on function public.get_pos_workspace_snapshot() to authenticated;
