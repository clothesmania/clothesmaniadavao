create table if not exists public.products (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  legacy_id text,
  sku text not null,
  name text not null,
  category text not null default '',
  size text not null default '',
  color text not null default '',
  cost numeric(12, 2) not null default 0 check (cost >= 0),
  price numeric(12, 2) not null default 0 check (price >= 0),
  quantity integer not null default 0 check (quantity >= 0),
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, id)
);

create unique index if not exists products_owner_sku_unique
  on public.products (owner_id, lower(sku));

create table if not exists public.stock_movements (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null,
  type text not null check (type in ('stock_in')),
  quantity integer not null check (quantity > 0),
  note text not null default '',
  is_sample boolean not null default false,
  occurred_at timestamptz not null,
  foreign key (owner_id, product_id) references public.products(owner_id, id) on delete restrict
);

create table if not exists public.sync_events (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null check (entity_type in ('product', 'stock_movement', 'legacy_snapshot')),
  entity_id uuid not null,
  operation text not null,
  created_at timestamptz not null,
  applied_at timestamptz not null default now()
);

create table if not exists public.legacy_import_snapshots (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  payload jsonb not null,
  imported_at timestamptz not null,
  is_sample boolean not null default false
);

alter table public.products enable row level security;
alter table public.stock_movements enable row level security;
alter table public.sync_events enable row level security;
alter table public.legacy_import_snapshots enable row level security;

create policy "Owners can read their products"
  on public.products for select to authenticated
  using ((select auth.uid()) = owner_id);

create policy "Owners can read their stock movements"
  on public.stock_movements for select to authenticated
  using ((select auth.uid()) = owner_id);

create policy "Owners can read their sync events"
  on public.sync_events for select to authenticated
  using ((select auth.uid()) = owner_id);

create policy "Owners can read their legacy snapshots"
  on public.legacy_import_snapshots for select to authenticated
  using ((select auth.uid()) = owner_id);

create or replace function public.apply_inventory_event(p_event jsonb)
returns void
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_owner_id uuid := auth.uid();
  v_event_id uuid := (p_event ->> 'id')::uuid;
  v_entity_type text := p_event ->> 'entityType';
  v_entity_id uuid := (p_event ->> 'entityId')::uuid;
  v_operation text := p_event ->> 'operation';
  v_payload jsonb := p_event -> 'payload';
  v_inserted integer;
  v_quantity integer;
begin
  if v_owner_id is null then
    raise exception 'Authentication required';
  end if;

  if v_event_id is null or v_entity_id is null or v_payload is null then
    raise exception 'Invalid inventory event';
  end if;

  insert into public.sync_events (id, owner_id, entity_type, entity_id, operation, created_at)
  values (v_event_id, v_owner_id, v_entity_type, v_entity_id, v_operation, (p_event ->> 'createdAt')::timestamptz)
  on conflict (id) do nothing;
  get diagnostics v_inserted = row_count;

  if v_inserted = 0 then
    return;
  end if;

  if v_entity_type = 'product' and v_operation = 'upsert' then
    insert into public.products (
      id, owner_id, legacy_id, sku, name, category, size, color, cost, price, quantity, is_sample, created_at, updated_at
    ) values (
      (v_payload ->> 'id')::uuid,
      v_owner_id,
      nullif(v_payload ->> 'legacyId', ''),
      v_payload ->> 'sku',
      v_payload ->> 'name',
      coalesce(v_payload ->> 'category', ''),
      coalesce(v_payload ->> 'size', ''),
      coalesce(v_payload ->> 'color', ''),
      (v_payload ->> 'cost')::numeric,
      (v_payload ->> 'price')::numeric,
      0,
      coalesce((v_payload ->> 'isSample')::boolean, false),
      coalesce((v_payload ->> 'createdAt')::timestamptz, now()),
      coalesce((v_payload ->> 'updatedAt')::timestamptz, now())
    )
    on conflict (id) do update set
      legacy_id = excluded.legacy_id,
      sku = excluded.sku,
      name = excluded.name,
      category = excluded.category,
      size = excluded.size,
      color = excluded.color,
      cost = excluded.cost,
      price = excluded.price,
      is_sample = excluded.is_sample,
      updated_at = excluded.updated_at
    where public.products.owner_id = v_owner_id;
    return;
  end if;

  if v_entity_type = 'legacy_snapshot' and v_operation = 'import' then
    insert into public.legacy_import_snapshots (id, owner_id, payload, imported_at, is_sample)
    values (
      v_entity_id,
      v_owner_id,
      v_payload -> 'snapshot',
      (p_event ->> 'createdAt')::timestamptz,
      false
    )
    on conflict (id) do nothing;
    return;
  end if;

  if v_entity_type = 'stock_movement' and v_operation = 'apply' then
    v_quantity := (v_payload ->> 'quantity')::integer;
    if v_quantity <= 0 then
      raise exception 'Stock-in quantity must be positive';
    end if;

    insert into public.stock_movements (id, owner_id, product_id, type, quantity, note, is_sample, occurred_at)
    values (
      (v_payload ->> 'id')::uuid,
      v_owner_id,
      (v_payload ->> 'productId')::uuid,
      'stock_in',
      v_quantity,
      coalesce(v_payload ->> 'note', ''),
      coalesce((v_payload ->> 'isSample')::boolean, false),
      (v_payload ->> 'occurredAt')::timestamptz
    )
    on conflict (id) do nothing;
    get diagnostics v_inserted = row_count;

    if v_inserted > 0 then
      update public.products
      set quantity = quantity + v_quantity,
          updated_at = (v_payload ->> 'occurredAt')::timestamptz
      where id = (v_payload ->> 'productId')::uuid
        and owner_id = v_owner_id;
      if not found then
        raise exception 'Product not found for this account';
      end if;
    end if;
    return;
  end if;

  raise exception 'Unsupported inventory event';
end;
$$;

revoke all on function public.apply_inventory_event(jsonb) from public, anon;
grant select on public.products, public.stock_movements, public.sync_events, public.legacy_import_snapshots to authenticated;
grant execute on function public.apply_inventory_event(jsonb) to authenticated;
