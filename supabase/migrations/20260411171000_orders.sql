create type public.order_status as enum ('new', 'confirmed', 'preparing', 'completed', 'cancelled');

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  order_code text not null unique,
  order_source text not null default 'qr_menu',
  status public.order_status not null default 'new',
  total numeric(12, 2) not null default 0,
  customer_first_name text not null default '',
  customer_last_name text not null default '',
  customer_phone text not null default '',
  customer_email text not null default '',
  address_json jsonb not null default '{}'::jsonb,
  payment_method text not null,
  meal_card_brand_id text,
  order_note text not null default '',
  constraint orders_order_code_not_blank check (btrim(order_code) <> ''),
  constraint orders_order_source_check check (order_source in ('qr_menu')),
  constraint orders_total_nonnegative check (total >= 0),
  constraint orders_payment_method_check check (payment_method in ('cash', 'door_card', 'meal_card')),
  constraint orders_meal_card_brand_check check (
    meal_card_brand_id is null or meal_card_brand_id in ('multinet', 'sodexo', 'edenred')
  )
);

create table public.order_lines (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  order_id uuid not null references public.orders (id) on delete cascade,
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  product_id uuid references public.menu_products (id) on delete set null,
  name text not null,
  qty integer not null default 1,
  unit_price numeric(12, 2) not null default 0,
  removed_ingredients text[] not null default '{}',
  sort_order integer not null default 0,
  constraint order_lines_name_not_blank check (btrim(name) <> ''),
  constraint order_lines_qty_positive check (qty > 0),
  constraint order_lines_unit_price_nonnegative check (unit_price >= 0)
);

create index orders_tenant_created_at_idx on public.orders (tenant_id, created_at desc);
create index orders_tenant_status_idx on public.orders (tenant_id, status);
create index order_lines_order_sort_idx on public.order_lines (order_id, sort_order, created_at);
create index order_lines_tenant_idx on public.order_lines (tenant_id);

comment on table public.orders is 'Merkezi siparis kayitlari; patron admin raporlari buradan okunur.';
comment on table public.order_lines is 'Siparis satirlari ve urun bazli rapor detaylari.';

create or replace function public.orders_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists orders_set_updated_at on public.orders;

create trigger orders_set_updated_at
before update on public.orders
for each row
execute function public.orders_set_updated_at();

create or replace function public.order_lines_validate_order_match()
returns trigger
language plpgsql
as $$
declare
  parent_tenant_id uuid;
begin
  select tenant_id
    into parent_tenant_id
  from public.orders
  where id = new.order_id;

  if parent_tenant_id is null then
    raise exception 'order not found for line';
  end if;

  if parent_tenant_id <> new.tenant_id then
    raise exception 'order line tenant mismatch';
  end if;

  return new;
end;
$$;

drop trigger if exists order_lines_validate_order_match on public.order_lines;

create trigger order_lines_validate_order_match
before insert or update on public.order_lines
for each row
execute function public.order_lines_validate_order_match();

alter table public.orders enable row level security;
alter table public.order_lines enable row level security;

create policy "orders_select_own_tenant"
on public.orders
for select
to authenticated
using (
  exists (
    select 1
    from public.tenants
    where tenants.id = orders.tenant_id
      and tenants.owner_user_id = (select auth.uid())
  )
);

create policy "order_lines_select_own_tenant"
on public.order_lines
for select
to authenticated
using (
  exists (
    select 1
    from public.tenants
    where tenants.id = order_lines.tenant_id
      and tenants.owner_user_id = (select auth.uid())
  )
);
