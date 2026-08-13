/*
  Dış müşteri hesapları — restoran sahibi (tenants.owner_user_id) ile ayrı tutulur.
  Aynı auth kullanıcısı hem restoran hem müşteri olamaz.
*/

create table if not exists public.customer_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  first_name text not null default '',
  last_name text not null default '',
  phone text not null default '',
  constraint customer_profiles_first_name_not_blank check (btrim(first_name) <> '')
);

comment on table public.customer_profiles is 'Platform müşterisi (yemek sipariş veren); restoran sahibi değil.';

create or replace function public.customer_profiles_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists customer_profiles_set_updated_at on public.customer_profiles;
create trigger customer_profiles_set_updated_at
before update on public.customer_profiles
for each row
execute function public.customer_profiles_set_updated_at();

create table if not exists public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id uuid not null references public.customer_profiles (user_id) on delete cascade,
  label text not null default 'Adres',
  address_json jsonb not null default '{}'::jsonb,
  is_default boolean not null default false
);

create index if not exists customer_addresses_user_idx
  on public.customer_addresses (user_id, is_default desc, created_at desc);

comment on table public.customer_addresses is 'Müşteri kayıtlı teslimat adresleri.';

create or replace function public.customer_addresses_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists customer_addresses_set_updated_at on public.customer_addresses;
create trigger customer_addresses_set_updated_at
before update on public.customer_addresses
for each row
execute function public.customer_addresses_set_updated_at();

alter table public.orders
  add column if not exists customer_user_id uuid references auth.users (id) on delete set null;

create index if not exists orders_customer_user_id_idx
  on public.orders (customer_user_id, created_at desc)
  where customer_user_id is not null;

alter table public.customer_profiles enable row level security;
alter table public.customer_addresses enable row level security;

drop policy if exists customer_profiles_own_all on public.customer_profiles;
create policy customer_profiles_own_all
  on public.customer_profiles
  for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists customer_addresses_own_all on public.customer_addresses;
create policy customer_addresses_own_all
  on public.customer_addresses
  for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists orders_select_own_customer on public.orders;
create policy orders_select_own_customer
  on public.orders
  for select
  to authenticated
  using (customer_user_id is not null and customer_user_id = (select auth.uid()));

drop policy if exists order_lines_select_own_customer on public.order_lines;
create policy order_lines_select_own_customer
  on public.order_lines
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.orders
      where orders.id = order_lines.order_id
        and orders.customer_user_id = (select auth.uid())
    )
  );
