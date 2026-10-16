create table if not exists public.pos_workspace_sync_events (
  workspace_owner_id uuid primary key references public.pos_workspaces(owner_id) on delete cascade,
  updated_at timestamptz not null
);

alter table public.pos_workspace_sync_events enable row level security;

drop policy if exists "Workspace admins can read sync events" on public.pos_workspace_sync_events;
create policy "Workspace admins can read sync events"
  on public.pos_workspace_sync_events for select to authenticated
  using (workspace_owner_id = public.current_pos_workspace_owner());

revoke all on public.pos_workspace_sync_events from public, anon, authenticated;
grant select on public.pos_workspace_sync_events to authenticated;

create or replace function public.notify_pos_workspace_change()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  insert into public.pos_workspace_sync_events (workspace_owner_id, updated_at)
  values (new.owner_id, new.updated_at)
  on conflict (workspace_owner_id) do update
    set updated_at = excluded.updated_at;
  return new;
end;
$$;

revoke all on function public.notify_pos_workspace_change() from public, anon, authenticated;

drop trigger if exists pos_workspace_change_notification on public.pos_workspaces;
create trigger pos_workspace_change_notification
  after insert or update of snapshot, updated_at on public.pos_workspaces
  for each row execute function public.notify_pos_workspace_change();

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'pos_workspace_sync_events'
  ) then
    execute 'alter publication supabase_realtime add table public.pos_workspace_sync_events';
  end if;
end;
$$;
