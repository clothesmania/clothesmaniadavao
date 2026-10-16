create or replace function public.ensure_pos_workspace(p_initial_snapshot jsonb)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_workspace_owner_id uuid;
  v_first_user_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if p_initial_snapshot is null
     or jsonb_typeof(p_initial_snapshot) <> 'object'
     or p_initial_snapshot->>'format' is distinct from 'clothes-mania-server-encrypted'
     or p_initial_snapshot->>'encrypted' is distinct from 'true'
     or p_initial_snapshot->>'version' is distinct from '2'
     or p_initial_snapshot->>'algorithm' is distinct from 'AES-GCM-256'
     or coalesce(p_initial_snapshot->>'iv', '') = ''
     or coalesce(p_initial_snapshot->>'ciphertext', '') = '' then
    raise exception 'Workspace data must be encrypted by the workspace sync service';
  end if;

  select workspace_owner_id into v_workspace_owner_id
  from public.pos_workspace_members where user_id = v_user_id;
  if v_workspace_owner_id is not null then return v_workspace_owner_id; end if;

  select owner_id into v_workspace_owner_id
  from public.pos_workspaces where owner_id = v_user_id;
  if v_workspace_owner_id is not null then
    insert into public.pos_workspace_members (user_id, workspace_owner_id, role)
    values (v_user_id, v_workspace_owner_id, 'owner') on conflict (user_id) do nothing;
    return v_workspace_owner_id;
  end if;

  if not exists (select 1 from public.pos_workspaces)
     and not exists (select 1 from public.pos_workspace_members) then
    select id into v_first_user_id from auth.users order by created_at, id limit 1;
    if v_first_user_id = v_user_id then
      insert into public.pos_workspaces (owner_id, snapshot)
      values (v_user_id, p_initial_snapshot) on conflict (owner_id) do nothing;
      insert into public.pos_workspace_members (user_id, workspace_owner_id, role)
      values (v_user_id, v_user_id, 'owner') on conflict (user_id) do nothing;
      return v_user_id;
    end if;
  end if;

  raise exception 'This account is not connected to the Clothes Mania workspace. Use an invitation code or ask an existing admin.';
end;
$$;

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
  from public.pos_workspaces where owner_id = v_workspace_owner_id for update;
  if not found then raise exception 'Shared workspace was not initialized'; end if;
  if p_expected_updated_at is null or p_expected_updated_at is distinct from v_existing_updated_at then
    raise exception 'Shared workspace changed on another device; refresh and resolve the conflict' using errcode = '40001';
  end if;
  update public.pos_workspaces
  set snapshot = p_snapshot, updated_at = v_updated_at
  where owner_id = v_workspace_owner_id;
  return v_updated_at;
end;
$$;
