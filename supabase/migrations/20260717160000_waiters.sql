/*
  Garsonlar — kurye benzeri kişi kaydı + kişiye özel 4 haneli PIN.
*/

create table if not exists public.waiters (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  first_name text not null default '',
  last_name text not null default '',
  phone text not null default '',
  pin_hash text not null,
  pin_set_at timestamptz not null default now(),
  is_active boolean not null default true,
  constraint waiters_first_name_not_blank check (btrim(first_name) <> ''),
  constraint waiters_last_name_not_blank check (btrim(last_name) <> ''),
  constraint waiters_pin_hash_not_blank check (btrim(pin_hash) <> '')
);

create index if not exists waiters_tenant_active_idx
  on public.waiters (tenant_id, is_active, last_name, first_name);

comment on table public.waiters is 'Restoran garson listesi — kişiye özel PIN ile panel girişi';

alter table public.orders
  add column if not exists waiter_id uuid references public.waiters (id) on delete set null;

create index if not exists orders_waiter_id_idx on public.orders (waiter_id)
  where waiter_id is not null;

alter table public.table_sessions
  add column if not exists waiter_id uuid references public.waiters (id) on delete set null;

-- RLS: sahip CRUD (kurye ile aynı model)
alter table public.waiters enable row level security;

drop policy if exists waiters_owner_all on public.waiters;
create policy waiters_owner_all
  on public.waiters
  for all
  to authenticated
  using (
    tenant_id in (
      select id from public.tenants where owner_user_id = auth.uid()
    )
  )
  with check (
    tenant_id in (
      select id from public.tenants where owner_user_id = auth.uid()
    )
  );
