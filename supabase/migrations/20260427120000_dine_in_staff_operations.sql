/*
  Masa siparisi (dine_in), personel panelleri, kurye ve operasyon loglari.
  Faz 0 — siparis ve panel altyapisi.
*/

-- fulfillment_type enum genisletme
do $$
begin
  alter type public.order_fulfillment_type add value if not exists 'dine_in';
exception
  when duplicate_object then null;
end $$;

-- tenants: masa ve personel PIN alanlari
alter table public.tenants
  add column if not exists table_count integer not null default 0,
  add column if not exists dine_in_enabled boolean not null default false,
  add column if not exists waiter_pin_hash text,
  add column if not exists waiter_pin_set_at timestamptz,
  add column if not exists cashier_pin_hash text,
  add column if not exists cashier_pin_set_at timestamptz;

alter table public.tenants
  drop constraint if exists tenants_table_count_range;

alter table public.tenants
  add constraint tenants_table_count_range
  check (table_count >= 0 and table_count <= 200);

comment on column public.tenants.table_count is 'Salondaki masa sayisi (kasa/garson grid)';
comment on column public.tenants.dine_in_enabled is 'Masa siparisi ve masa QR aktif';
comment on column public.tenants.waiter_pin_hash is 'Garson paneli PIN hash';
comment on column public.tenants.cashier_pin_hash is 'Kasa paneli PIN hash';

-- kuryeler
create table if not exists public.couriers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  first_name text not null default '',
  last_name text not null default '',
  phone text not null default '',
  is_active boolean not null default true,
  constraint couriers_first_name_not_blank check (btrim(first_name) <> ''),
  constraint couriers_last_name_not_blank check (btrim(last_name) <> '')
);

create index if not exists couriers_tenant_active_idx
  on public.couriers (tenant_id, is_active, last_name, first_name);

comment on table public.couriers is 'Restoran kurye listesi — paket siparis atamasi';

-- masa oturumlari
create table if not exists public.table_sessions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  table_number integer not null,
  status text not null default 'active',
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  opened_by text not null default 'table_qr',
  constraint table_sessions_table_number_positive check (table_number > 0),
  constraint table_sessions_status_check check (status in ('active', 'bill_requested', 'closed')),
  constraint table_sessions_opened_by_check check (opened_by in ('table_qr', 'waiter', 'cashier'))
);

create unique index if not exists table_sessions_one_open_per_table_idx
  on public.table_sessions (tenant_id, table_number)
  where status in ('active', 'bill_requested');

create index if not exists table_sessions_tenant_status_idx
  on public.table_sessions (tenant_id, status, table_number);

comment on table public.table_sessions is 'Masada birden fazla siparis — oturum bazli hesap';

-- orders genisletme
alter table public.orders
  add column if not exists table_number integer,
  add column if not exists table_session_id uuid references public.table_sessions (id) on delete set null,
  add column if not exists courier_id uuid references public.couriers (id) on delete set null,
  add column if not exists delivery_status text,
  add column if not exists payment_method_at_close text;

alter table public.orders
  drop constraint if exists orders_table_number_positive;

alter table public.orders
  add constraint orders_table_number_positive
  check (table_number is null or table_number > 0);

alter table public.orders
  drop constraint if exists orders_delivery_status_check;

alter table public.orders
  add constraint orders_delivery_status_check
  check (
    delivery_status is null
    or delivery_status in (
      'pending',
      'preparing',
      'ready_for_dispatch',
      'out_for_delivery',
      'delivered',
      'cancelled'
    )
  );

alter table public.orders
  drop constraint if exists orders_payment_method_at_close_check;

alter table public.orders
  add constraint orders_payment_method_at_close_check
  check (
    payment_method_at_close is null
    or payment_method_at_close in ('cash', 'door_card', 'meal_card')
  );

alter table public.orders
  drop constraint if exists orders_order_source_check;

alter table public.orders
  add constraint orders_order_source_check
  check (order_source in ('qr_menu', 'marketplace', 'table_qr', 'waiter', 'cashier'));

create index if not exists orders_tenant_fulfillment_idx
  on public.orders (tenant_id, fulfillment_type, created_at desc);

create index if not exists orders_table_session_idx
  on public.orders (table_session_id)
  where table_session_id is not null;

create index if not exists orders_courier_idx
  on public.orders (courier_id)
  where courier_id is not null;

comment on column public.orders.table_number is 'Masa numarasi — dine_in siparisler';
comment on column public.orders.table_session_id is 'Masadaki oturum';
comment on column public.orders.courier_id is 'Paket siparis kuryesi';
comment on column public.orders.delivery_status is 'Paket operasyon durumu';
comment on column public.orders.payment_method_at_close is 'Kapanista kesinlesen odeme yontemi';

-- operasyon loglari
create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  actor_type text not null,
  actor_label text not null default '',
  action text not null,
  entity_type text not null default '',
  entity_id uuid,
  order_code text,
  metadata jsonb not null default '{}'::jsonb,
  constraint activity_logs_actor_type_check check (
    actor_type in ('owner', 'admin', 'waiter', 'cashier', 'system', 'customer')
  ),
  constraint activity_logs_action_not_blank check (btrim(action) <> '')
);

create index if not exists activity_logs_tenant_created_idx
  on public.activity_logs (tenant_id, created_at desc);

create index if not exists activity_logs_tenant_action_idx
  on public.activity_logs (tenant_id, action, created_at desc);

comment on table public.activity_logs is 'Panel operasyon kayitlari — admin log sekmesi';

-- updated_at triggerlari
create or replace function public.set_updated_at_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists couriers_set_updated_at on public.couriers;
create trigger couriers_set_updated_at
before update on public.couriers
for each row
execute function public.set_updated_at_timestamp();

drop trigger if exists table_sessions_set_updated_at on public.table_sessions;
create trigger table_sessions_set_updated_at
before update on public.table_sessions
for each row
execute function public.set_updated_at_timestamp();

-- RLS
alter table public.couriers enable row level security;
alter table public.table_sessions enable row level security;
alter table public.activity_logs enable row level security;

create policy "couriers_select_own_tenant"
on public.couriers
for select
to authenticated
using (
  exists (
    select 1
    from public.tenants
    where tenants.id = couriers.tenant_id
      and tenants.owner_user_id = (select auth.uid())
  )
);

create policy "couriers_insert_own_tenant"
on public.couriers
for insert
to authenticated
with check (
  exists (
    select 1
    from public.tenants
    where tenants.id = couriers.tenant_id
      and tenants.owner_user_id = (select auth.uid())
  )
);

create policy "couriers_update_own_tenant"
on public.couriers
for update
to authenticated
using (
  exists (
    select 1
    from public.tenants
    where tenants.id = couriers.tenant_id
      and tenants.owner_user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.tenants
    where tenants.id = couriers.tenant_id
      and tenants.owner_user_id = (select auth.uid())
  )
);

create policy "couriers_delete_own_tenant"
on public.couriers
for delete
to authenticated
using (
  exists (
    select 1
    from public.tenants
    where tenants.id = couriers.tenant_id
      and tenants.owner_user_id = (select auth.uid())
  )
);

create policy "table_sessions_select_own_tenant"
on public.table_sessions
for select
to authenticated
using (
  exists (
    select 1
    from public.tenants
    where tenants.id = table_sessions.tenant_id
      and tenants.owner_user_id = (select auth.uid())
  )
);

create policy "activity_logs_select_own_tenant"
on public.activity_logs
for select
to authenticated
using (
  exists (
    select 1
    from public.tenants
    where tenants.id = activity_logs.tenant_id
      and tenants.owner_user_id = (select auth.uid())
  )
);
