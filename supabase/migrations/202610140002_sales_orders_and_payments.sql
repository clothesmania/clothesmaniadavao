alter table public.stock_movements
  drop constraint if exists stock_movements_type_check;

alter table public.stock_movements
  add constraint stock_movements_type_check
  check (type in ('stock_in', 'stock_out', 'sale_return'));

alter table public.stock_movements
  add column if not exists order_id uuid;

alter table public.sync_events
  drop constraint if exists sync_events_entity_type_check;

alter table public.sync_events
  add constraint sync_events_entity_type_check
  check (entity_type in ('product', 'stock_movement', 'legacy_snapshot', 'sales_order', 'payment', 'refund', 'live_session', 'audit_log'));

create table if not exists public.sales_orders (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  legacy_id text,
  buyer text not null,
  item text not null,
  product_id uuid,
  sku text not null default '',
  quantity integer not null check (quantity > 0),
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  unit_cost numeric(12, 2) not null default 0 check (unit_cost >= 0),
  total numeric(12, 2) not null check (total >= 0),
  order_date date not null,
  order_time text not null default '',
  session_id text,
  legacy_session_id text not null default '',
  session_name text not null default '',
  seller text not null default '',
  status text not null check (status in ('active', 'cancelled')),
  is_sample boolean not null default false,
  cancelled_at timestamptz,
  cancellation_reason text not null default '',
  created_at timestamptz not null,
  updated_at timestamptz not null,
  unique (owner_id, id),
  foreign key (owner_id, product_id) references public.products(owner_id, id) on delete restrict
);

create unique index if not exists sales_orders_owner_legacy_id_unique
  on public.sales_orders(owner_id, legacy_id)
  where legacy_id is not null and legacy_id <> '';

create table if not exists public.payments (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  order_id uuid not null,
  amount numeric(12, 2) not null check (amount > 0),
  method text not null,
  reference text not null default '',
  paid_at timestamptz not null,
  is_sample boolean not null default false,
  foreign key (owner_id, order_id) references public.sales_orders(owner_id, id) on delete restrict
);

create table if not exists public.refunds (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  order_id uuid not null,
  amount numeric(12, 2) not null check (amount > 0),
  method text not null default '',
  reference text not null default '',
  reason text not null default '',
  refunded_at timestamptz not null,
  is_sample boolean not null default false,
  foreign key (owner_id, order_id) references public.sales_orders(owner_id, id) on delete restrict
);

create table if not exists public.live_sessions (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  legacy_id text not null default '',
  name text not null,
  seller text not null default '',
  session_date text not null default '',
  started_at timestamptz,
  ended_at timestamptz,
  is_sample boolean not null default false
);

create table if not exists public.audit_logs (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  legacy_id text not null default '',
  action text not null,
  entity_type text not null,
  entity_id text not null default '',
  summary text not null default '',
  actor_id text,
  actor_email text not null default 'Local operator',
  occurred_at timestamptz not null,
  is_sample boolean not null default false
);

alter table public.sales_orders enable row level security;
alter table public.payments enable row level security;
alter table public.refunds enable row level security;
alter table public.live_sessions enable row level security;
alter table public.audit_logs enable row level security;

create policy "Owners can read their sales orders" on public.sales_orders
  for select to authenticated using ((select auth.uid()) = owner_id);
create policy "Owners can read their payments" on public.payments
  for select to authenticated using ((select auth.uid()) = owner_id);
create policy "Owners can read their refunds" on public.refunds
  for select to authenticated using ((select auth.uid()) = owner_id);
create policy "Owners can read their live sessions" on public.live_sessions
  for select to authenticated using ((select auth.uid()) = owner_id);
create policy "Owners can read their audit logs" on public.audit_logs
  for select to authenticated using ((select auth.uid()) = owner_id);

grant select on public.sales_orders, public.payments, public.refunds, public.live_sessions, public.audit_logs to authenticated;

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
  v_movement_type text;
  v_product_id uuid;
begin
  if v_owner_id is null then
    raise exception 'Authentication required';
  end if;
  if v_event_id is null or v_entity_id is null or v_payload is null then
    raise exception 'Invalid sync event';
  end if;

  insert into public.sync_events (id, owner_id, entity_type, entity_id, operation, created_at)
  values (v_event_id, v_owner_id, v_entity_type, v_entity_id, v_operation, (p_event ->> 'createdAt')::timestamptz)
  on conflict (id) do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted = 0 then return; end if;

  if v_entity_type = 'product' and v_operation = 'upsert' then
    insert into public.products (
      id, owner_id, legacy_id, sku, name, category, size, color, cost, price, quantity, is_sample, created_at, updated_at
    ) values (
      (v_payload ->> 'id')::uuid, v_owner_id, nullif(v_payload ->> 'legacyId', ''),
      v_payload ->> 'sku', v_payload ->> 'name', coalesce(v_payload ->> 'category', ''),
      coalesce(v_payload ->> 'size', ''), coalesce(v_payload ->> 'color', ''),
      (v_payload ->> 'cost')::numeric, (v_payload ->> 'price')::numeric, 0,
      coalesce((v_payload ->> 'isSample')::boolean, false),
      coalesce((v_payload ->> 'createdAt')::timestamptz, now()),
      coalesce((v_payload ->> 'updatedAt')::timestamptz, now())
    )
    on conflict (id) do update set
      legacy_id = excluded.legacy_id, sku = excluded.sku, name = excluded.name,
      category = excluded.category, size = excluded.size, color = excluded.color,
      cost = excluded.cost, price = excluded.price, is_sample = excluded.is_sample,
      updated_at = excluded.updated_at
    where public.products.owner_id = v_owner_id;
    return;
  end if;

  if v_entity_type = 'sales_order' and v_operation = 'upsert' then
    insert into public.sales_orders (
      id, owner_id, legacy_id, buyer, item, product_id, sku, quantity, unit_price, unit_cost,
      total, order_date, order_time, session_id, legacy_session_id, session_name, seller,
      status, is_sample, cancelled_at, cancellation_reason, created_at, updated_at
    ) values (
      (v_payload ->> 'id')::uuid, v_owner_id, nullif(v_payload ->> 'legacyId', ''),
      v_payload ->> 'buyer', v_payload ->> 'item', nullif(v_payload ->> 'productId', '')::uuid,
      coalesce(v_payload ->> 'sku', ''), (v_payload ->> 'quantity')::integer,
      (v_payload ->> 'unitPrice')::numeric, coalesce((v_payload ->> 'unitCost')::numeric, 0),
      (v_payload ->> 'total')::numeric, (v_payload ->> 'orderDate')::date,
      coalesce(v_payload ->> 'orderTime', ''), nullif(v_payload ->> 'sessionId', ''),
      coalesce(v_payload ->> 'legacySessionId', ''), coalesce(v_payload ->> 'sessionName', ''),
      coalesce(v_payload ->> 'seller', ''), v_payload ->> 'status',
      coalesce((v_payload ->> 'isSample')::boolean, false),
      nullif(v_payload ->> 'cancelledAt', '')::timestamptz,
      coalesce(v_payload ->> 'cancellationReason', ''),
      (v_payload ->> 'createdAt')::timestamptz, (v_payload ->> 'updatedAt')::timestamptz
    )
    on conflict (id) do update set
      buyer = excluded.buyer, item = excluded.item, product_id = excluded.product_id,
      sku = excluded.sku, quantity = excluded.quantity, unit_price = excluded.unit_price,
      unit_cost = excluded.unit_cost, total = excluded.total, order_date = excluded.order_date,
      order_time = excluded.order_time, session_id = excluded.session_id,
      legacy_session_id = excluded.legacy_session_id, session_name = excluded.session_name,
      seller = excluded.seller, status = excluded.status, is_sample = excluded.is_sample,
      cancelled_at = excluded.cancelled_at, cancellation_reason = excluded.cancellation_reason,
      updated_at = excluded.updated_at
    where public.sales_orders.owner_id = v_owner_id;
    return;
  end if;

  if v_entity_type = 'stock_movement' and v_operation = 'apply' then
    v_quantity := (v_payload ->> 'quantity')::integer;
    v_movement_type := v_payload ->> 'type';
    v_product_id := (v_payload ->> 'productId')::uuid;
    if v_quantity <= 0 or v_movement_type not in ('stock_in', 'stock_out', 'sale_return') then
      raise exception 'Invalid stock movement';
    end if;
    insert into public.stock_movements (id, owner_id, product_id, type, quantity, note, is_sample, occurred_at, order_id)
    values (
      (v_payload ->> 'id')::uuid, v_owner_id, v_product_id, v_movement_type, v_quantity,
      coalesce(v_payload ->> 'note', ''), coalesce((v_payload ->> 'isSample')::boolean, false),
      (v_payload ->> 'occurredAt')::timestamptz, nullif(v_payload ->> 'orderId', '')::uuid
    ) on conflict (id) do nothing;
    get diagnostics v_inserted = row_count;
    if v_inserted > 0 then
      update public.products
      set quantity = quantity + case when v_movement_type = 'stock_out' then -v_quantity else v_quantity end,
          updated_at = (v_payload ->> 'occurredAt')::timestamptz
      where id = v_product_id and owner_id = v_owner_id
        and (v_movement_type <> 'stock_out' or quantity >= v_quantity);
      if not found then raise exception 'Product missing or insufficient remote stock'; end if;
    end if;
    return;
  end if;

  if v_entity_type = 'payment' and v_operation = 'insert' then
    insert into public.payments (id, owner_id, order_id, amount, method, reference, paid_at, is_sample)
    values (
      (v_payload ->> 'id')::uuid, v_owner_id, (v_payload ->> 'orderId')::uuid,
      (v_payload ->> 'amount')::numeric, v_payload ->> 'method',
      coalesce(v_payload ->> 'reference', ''), (v_payload ->> 'paidAt')::timestamptz,
      coalesce((v_payload ->> 'isSample')::boolean, false)
    ) on conflict (id) do nothing;
    return;
  end if;

  if v_entity_type = 'refund' and v_operation = 'insert' then
    insert into public.refunds (id, owner_id, order_id, amount, method, reference, reason, refunded_at, is_sample)
    values (
      (v_payload ->> 'id')::uuid, v_owner_id, (v_payload ->> 'orderId')::uuid,
      (v_payload ->> 'amount')::numeric, coalesce(v_payload ->> 'method', ''),
      coalesce(v_payload ->> 'reference', ''), coalesce(v_payload ->> 'reason', ''),
      (v_payload ->> 'refundedAt')::timestamptz, coalesce((v_payload ->> 'isSample')::boolean, false)
    ) on conflict (id) do nothing;
    return;
  end if;

  if v_entity_type = 'live_session' and v_operation = 'upsert' then
    insert into public.live_sessions (id, owner_id, legacy_id, name, seller, session_date, started_at, ended_at, is_sample)
    values (
      (v_payload ->> 'id')::uuid, v_owner_id, coalesce(v_payload ->> 'legacyId', ''),
      v_payload ->> 'name', coalesce(v_payload ->> 'seller', ''), coalesce(v_payload ->> 'date', ''),
      nullif(v_payload ->> 'startedAt', '')::timestamptz, nullif(v_payload ->> 'endedAt', '')::timestamptz,
      coalesce((v_payload ->> 'isSample')::boolean, false)
    ) on conflict (id) do update set name = excluded.name, seller = excluded.seller,
      session_date = excluded.session_date, started_at = excluded.started_at, ended_at = excluded.ended_at
      where public.live_sessions.owner_id = v_owner_id;
    return;
  end if;

  if v_entity_type = 'audit_log' and v_operation = 'insert' then
    insert into public.audit_logs (id, owner_id, legacy_id, action, entity_type, entity_id, summary, actor_id, actor_email, occurred_at, is_sample)
    values (
      (v_payload ->> 'id')::uuid, v_owner_id, coalesce(v_payload ->> 'legacyId', ''),
      v_payload ->> 'action', v_payload ->> 'entityType', coalesce(v_payload ->> 'entityId', ''),
      coalesce(v_payload ->> 'summary', ''), nullif(v_payload ->> 'actorId', ''),
      coalesce(v_payload ->> 'actorEmail', 'Local operator'), (v_payload ->> 'occurredAt')::timestamptz,
      coalesce((v_payload ->> 'isSample')::boolean, false)
    ) on conflict (id) do nothing;
    return;
  end if;

  if v_entity_type = 'legacy_snapshot' and v_operation = 'import' then
    insert into public.legacy_import_snapshots (id, owner_id, payload, imported_at, is_sample)
    values ((v_entity_id), v_owner_id, v_payload -> 'snapshot', (p_event ->> 'createdAt')::timestamptz, false)
    on conflict (id) do nothing;
    return;
  end if;

  raise exception 'Unsupported sync event: % / %', v_entity_type, v_operation;
end;
$$;

revoke all on function public.apply_inventory_event(jsonb) from public, anon;
grant execute on function public.apply_inventory_event(jsonb) to authenticated;
