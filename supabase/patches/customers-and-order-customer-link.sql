-- Müşteri kaydı (online + paket) ve sipariş müşteri ilişkisi

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  full_name text not null,
  phone text not null,
  delivery_address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists customers_restaurant_phone_uniq
  on public.customers (restaurant_id, phone);

create index if not exists customers_restaurant_created_idx
  on public.customers (restaurant_id, created_at desc);

alter table public.orders
  add column if not exists customer_id uuid references public.customers (id) on delete set null;

comment on column public.orders.customer_id is
  'Siparişin bağlı müşteri kaydı (online/paket akışlarında doldurulur).';

-- updated_at tetikleyici
create or replace function public.touch_customers_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists tr_customers_updated_at on public.customers;
create trigger tr_customers_updated_at
  before update on public.customers
  for each row
  execute procedure public.touch_customers_updated_at();

-- RLS
alter table public.customers enable row level security;

drop policy if exists customers_select_members on public.customers;
drop policy if exists customers_insert_members on public.customers;
drop policy if exists customers_update_members on public.customers;

create policy customers_select_members on public.customers
for select to authenticated
using (
  exists (
    select 1 from public.restaurant_members rm
    where rm.restaurant_id = customers.restaurant_id
      and rm.user_id = auth.uid()
      and rm.is_active = true
  )
);

create policy customers_insert_members on public.customers
for insert to authenticated
with check (
  exists (
    select 1 from public.restaurant_members rm
    where rm.restaurant_id = customers.restaurant_id
      and rm.user_id = auth.uid()
      and rm.is_active = true
  )
);

create policy customers_update_members on public.customers
for update to authenticated
using (
  exists (
    select 1 from public.restaurant_members rm
    where rm.restaurant_id = customers.restaurant_id
      and rm.user_id = auth.uid()
      and rm.is_active = true
  )
)
with check (
  exists (
    select 1 from public.restaurant_members rm
    where rm.restaurant_id = customers.restaurant_id
      and rm.user_id = auth.uid()
      and rm.is_active = true
  )
);
