create table if not exists public.pos_workspaces (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.pos_workspaces enable row level security;

drop policy if exists "Owners can read their POS workspace" on public.pos_workspaces;
create policy "Owners can read their POS workspace"
  on public.pos_workspaces for select to authenticated
  using ((select auth.uid()) = owner_id);

revoke all on public.pos_workspaces from public, anon, authenticated;
grant select on public.pos_workspaces to authenticated;

create or replace function public.save_pos_workspace_snapshot(
  p_snapshot jsonb,
  p_expected_updated_at timestamptz default null
)
returns timestamptz
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_owner_id uuid := auth.uid();
  v_existing_updated_at timestamptz;
  v_updated_at timestamptz := clock_timestamp();
begin
  if v_owner_id is null then
    raise exception 'Authentication required';
  end if;

  if p_snapshot is null or jsonb_typeof(p_snapshot) <> 'object' then
    raise exception 'Workspace snapshot must be a JSON object';
  end if;

  select updated_at into v_existing_updated_at
  from public.pos_workspaces
  where owner_id = v_owner_id
  for update;

  if not found then
    if p_expected_updated_at is not null then
      raise exception 'Cloud workspace changed; refresh before syncing' using errcode = '40001';
    end if;

    insert into public.pos_workspaces (owner_id, snapshot, updated_at)
    values (v_owner_id, p_snapshot, v_updated_at);
    return v_updated_at;
  end if;

  if p_expected_updated_at is null or p_expected_updated_at is distinct from v_existing_updated_at then
    raise exception 'Cloud workspace changed; choose which copy to keep' using errcode = '40001';
  end if;

  update public.pos_workspaces
  set snapshot = p_snapshot,
      updated_at = v_updated_at
  where owner_id = v_owner_id;

  return v_updated_at;
end;
$$;

revoke all on function public.save_pos_workspace_snapshot(jsonb, timestamptz) from public, anon;
grant execute on function public.save_pos_workspace_snapshot(jsonb, timestamptz) to authenticated;
