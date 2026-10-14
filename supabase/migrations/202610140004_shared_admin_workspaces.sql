create table if not exists public.pos_workspace_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  workspace_owner_id uuid not null references public.pos_workspaces(owner_id) on delete cascade,
  role text not null check (role in ('owner', 'admin')),
  joined_at timestamptz not null default now(),
  unique (workspace_owner_id, user_id)
);

create index if not exists pos_workspace_members_owner_idx
  on public.pos_workspace_members (workspace_owner_id);

insert into public.pos_workspace_members (user_id, workspace_owner_id, role)
select owner_id, owner_id, 'owner'
from public.pos_workspaces
on conflict (user_id) do nothing;

create table if not exists public.pos_workspace_invites (
  id uuid primary key default gen_random_uuid(),
  workspace_owner_id uuid not null references public.pos_workspaces(owner_id) on delete cascade,
  email text not null,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  accepted_at timestamptz
);

create index if not exists pos_workspace_invites_owner_idx
  on public.pos_workspace_invites (workspace_owner_id, expires_at)
  where accepted_at is null;

alter table public.pos_workspace_members enable row level security;
alter table public.pos_workspace_invites enable row level security;

drop policy if exists "Owners can read their POS workspace" on public.pos_workspaces;

create or replace function public.current_pos_workspace_owner()
returns uuid
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select workspace_owner_id
  from public.pos_workspace_members
  where user_id = auth.uid()
  limit 1
$$;

drop policy if exists "Workspace admins can read their POS workspace" on public.pos_workspaces;
create policy "Workspace admins can read their POS workspace"
  on public.pos_workspaces for select to authenticated
  using (owner_id = public.current_pos_workspace_owner());

drop policy if exists "Admins can read their own membership" on public.pos_workspace_members;
create policy "Admins can read their own membership"
  on public.pos_workspace_members for select to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.pos_workspace_invites from public, anon, authenticated;
revoke all on public.pos_workspace_members from public, anon, authenticated;
grant select on public.pos_workspace_members to authenticated;
grant select on public.pos_workspaces to authenticated;

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

  if p_initial_snapshot is null or jsonb_typeof(p_initial_snapshot) <> 'object' then
    raise exception 'Workspace snapshot must be a JSON object';
  end if;

  select workspace_owner_id into v_workspace_owner_id
  from public.pos_workspace_members
  where user_id = v_user_id;

  if v_workspace_owner_id is not null then
    return v_workspace_owner_id;
  end if;

  select owner_id into v_workspace_owner_id
  from public.pos_workspaces
  where owner_id = v_user_id;

  if v_workspace_owner_id is not null then
    insert into public.pos_workspace_members (user_id, workspace_owner_id, role)
    values (v_user_id, v_workspace_owner_id, 'owner')
    on conflict (user_id) do nothing;
    return v_workspace_owner_id;
  end if;

  if not exists (select 1 from public.pos_workspaces)
     and not exists (select 1 from public.pos_workspace_members) then
    select id into v_first_user_id
    from auth.users
    order by created_at, id
    limit 1;

    if v_first_user_id = v_user_id then
      insert into public.pos_workspaces (owner_id, snapshot)
      values (v_user_id, p_initial_snapshot)
      on conflict (owner_id) do nothing;
      insert into public.pos_workspace_members (user_id, workspace_owner_id, role)
      values (v_user_id, v_user_id, 'owner')
      on conflict (user_id) do nothing;
      return v_user_id;
    end if;
  end if;

  raise exception 'This account is not connected to the Clothes Mania workspace. Use an invitation code or ask an existing admin.';
end;
$$;

create or replace function public.get_pos_workspace_snapshot()
returns table(workspace_owner_id uuid, snapshot jsonb, updated_at timestamptz)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_workspace_owner_id uuid := public.current_pos_workspace_owner();
begin
  if v_workspace_owner_id is null then
    raise exception 'Workspace membership required';
  end if;

  return query
  select w.owner_id, w.snapshot, w.updated_at
  from public.pos_workspaces w
  where w.owner_id = v_workspace_owner_id;
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
  if v_workspace_owner_id is null then
    raise exception 'Workspace membership required';
  end if;

  if p_snapshot is null or jsonb_typeof(p_snapshot) <> 'object' then
    raise exception 'Workspace snapshot must be a JSON object';
  end if;

  select updated_at into v_existing_updated_at
  from public.pos_workspaces
  where owner_id = v_workspace_owner_id
  for update;

  if not found then
    raise exception 'Shared workspace was not initialized';
  end if;

  if p_expected_updated_at is null or p_expected_updated_at is distinct from v_existing_updated_at then
    raise exception 'Shared workspace changed on another device; refresh and resolve the conflict' using errcode = '40001';
  end if;

  update public.pos_workspaces
  set snapshot = p_snapshot,
      updated_at = v_updated_at
  where owner_id = v_workspace_owner_id;

  return v_updated_at;
end;
$$;

create or replace function public.create_pos_admin_invite(p_email text, p_token_hash text)
returns timestamptz
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  v_workspace_owner_id uuid := public.current_pos_workspace_owner();
  v_email text := lower(trim(p_email));
  v_member_count integer;
  v_pending_count integer;
  v_expires_at timestamptz := now() + interval '24 hours';
begin
  if v_workspace_owner_id is null then
    raise exception 'Workspace membership required';
  end if;
  if v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Enter a valid admin email address';
  end if;
  if p_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid invitation token';
  end if;

  perform 1 from public.pos_workspaces where owner_id = v_workspace_owner_id for update;

  select count(*) into v_member_count
  from public.pos_workspace_members
  where workspace_owner_id = v_workspace_owner_id;
  select count(*) into v_pending_count
  from public.pos_workspace_invites
  where workspace_owner_id = v_workspace_owner_id
    and accepted_at is null
    and expires_at > now();

  if v_member_count + v_pending_count >= 5 then
    raise exception 'This workspace already has five admins or active invitations';
  end if;
  if exists (
    select 1 from auth.users u
    join public.pos_workspace_members m on m.user_id = u.id
    where m.workspace_owner_id = v_workspace_owner_id and lower(u.email) = v_email
  ) then
    raise exception 'That email already belongs to this workspace';
  end if;
  if exists (
    select 1 from public.pos_workspace_invites i
    where i.workspace_owner_id = v_workspace_owner_id
      and i.email = v_email
      and i.accepted_at is null
      and i.expires_at > now()
  ) then
    raise exception 'That email already has an active invitation';
  end if;

  insert into public.pos_workspace_invites (workspace_owner_id, email, token_hash, created_by, expires_at)
  values (v_workspace_owner_id, v_email, p_token_hash, auth.uid(), v_expires_at);
  return v_expires_at;
end;
$$;

create or replace function public.validate_pos_admin_invite(p_email text, p_token_hash text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.pos_workspace_invites i
    where i.email = lower(trim(p_email))
      and i.token_hash = p_token_hash
      and i.accepted_at is null
      and i.expires_at > now()
      and (select count(*) from public.pos_workspace_members m where m.workspace_owner_id = i.workspace_owner_id) < 5
  )
$$;

create or replace function public.accept_pos_admin_invite(p_token_hash text)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_user_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_invite public.pos_workspace_invites%rowtype;
  v_member_count integer;
begin
  if v_user_id is null then
    raise exception 'Sign in before accepting an invitation';
  end if;
  if p_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid invitation code';
  end if;

  select * into v_invite
  from public.pos_workspace_invites
  where token_hash = p_token_hash
  for update;

  if not found or v_invite.accepted_at is not null or v_invite.expires_at <= now() then
    raise exception 'Invitation is invalid, expired, or already used';
  end if;
  if v_invite.email <> v_user_email then
    raise exception 'Sign in with the email address this invitation was created for';
  end if;

  perform 1 from public.pos_workspaces where owner_id = v_invite.workspace_owner_id for update;
  select count(*) into v_member_count
  from public.pos_workspace_members
  where workspace_owner_id = v_invite.workspace_owner_id;
  if v_member_count >= 5 then
    raise exception 'This workspace already has five admins';
  end if;
  if exists (select 1 from public.pos_workspace_members where user_id = v_user_id) then
    raise exception 'This account already belongs to a workspace';
  end if;

  insert into public.pos_workspace_members (user_id, workspace_owner_id, role)
  values (v_user_id, v_invite.workspace_owner_id, 'admin');
  update public.pos_workspace_invites set accepted_at = now() where id = v_invite.id;
  return v_invite.workspace_owner_id;
end;
$$;

create or replace function public.list_pos_workspace_admins()
returns table(user_id uuid, email text, full_name text, role text, joined_at timestamptz, pending_invites bigint)
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  v_workspace_owner_id uuid := public.current_pos_workspace_owner();
begin
  if v_workspace_owner_id is null then
    raise exception 'Workspace membership required';
  end if;

  return query
  select u.id, u.email::text, coalesce(u.raw_user_meta_data ->> 'full_name', ''), m.role, m.joined_at,
         (select count(*) from public.pos_workspace_invites i
          where i.workspace_owner_id = v_workspace_owner_id and i.accepted_at is null and i.expires_at > now())
  from public.pos_workspace_members m
  join auth.users u on u.id = m.user_id
  where m.workspace_owner_id = v_workspace_owner_id
  order by case m.role when 'owner' then 0 else 1 end, m.joined_at;
end;
$$;

revoke all on function public.current_pos_workspace_owner() from public, anon;
revoke all on function public.ensure_pos_workspace(jsonb) from public, anon;
revoke all on function public.get_pos_workspace_snapshot() from public, anon;
revoke all on function public.save_pos_workspace_snapshot(jsonb, timestamptz) from public, anon;
revoke all on function public.create_pos_admin_invite(text, text) from public, anon;
revoke all on function public.validate_pos_admin_invite(text, text) from public;
revoke all on function public.accept_pos_admin_invite(text) from public, anon;
revoke all on function public.list_pos_workspace_admins() from public, anon;

grant execute on function public.current_pos_workspace_owner() to authenticated;
grant execute on function public.ensure_pos_workspace(jsonb) to authenticated;
grant execute on function public.get_pos_workspace_snapshot() to authenticated;
grant execute on function public.save_pos_workspace_snapshot(jsonb, timestamptz) to authenticated;
grant execute on function public.create_pos_admin_invite(text, text) to authenticated;
grant execute on function public.validate_pos_admin_invite(text, text) to anon, authenticated;
grant execute on function public.accept_pos_admin_invite(text) to authenticated;
grant execute on function public.list_pos_workspace_admins() to authenticated;
