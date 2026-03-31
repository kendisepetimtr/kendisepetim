-- Kuryeler, masa oturumları, sipariş kapatma, iş günü / tarih tercihi
-- Sıra: restaurants genişletme → couriers → table_sessions → orders kolonları → tetikleyici → RLS

-- Restoran: iş günü (isteğe bağlı) ve sipariş tarih modu
alter table public.restaurants
  add column if not exists business_day_opens_at time without time zone,
  add column if not exists business_day_closes_at time without time zone,
  add column if not exists orders_date_basis text not null default 'calendar';

comment on column public.restaurants.business_day_opens_at is
  'İş günü modunda varsayılan açılış saati (örn. 09:00).';
comment on column public.restaurants.business_day_closes_at is
  'İş günü modunda kapanış; ertesi güne taşabilir (örn. 03:00).';
comment on column public.restaurants.orders_date_basis is
  'Sipariş listelerinde tarih: calendar | business_day';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'restaurants_orders_date_basis_check'
  ) then
    alter table public.restaurants
      add constraint restaurants_orders_date_basis_check
      check (orders_date_basis in ('calendar', 'business_day'));
  end if;
end $$;

-- Kuryeler
create table if not exists public.couriers (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  first_name text not null,
  last_name text not null,
  phone text,
  pos_number text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists couriers_restaurant_id_idx on public.couriers (restaurant_id);

comment on table public.couriers is 'Paket / teslimat siparişlerinde kasiyer kapatırken seçilen kurye.';

-- Masa oturumu (garson siparişleri aynı hesaba bağlanır)
create table if not exists public.table_sessions (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  table_number text not null,
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists table_sessions_restaurant_table_open_idx
  on public.table_sessions (restaurant_id, table_number)
  where closed_at is null;

comment on table public.table_sessions is 'Masa bazlı hesap oturumu; kasiyer oturumu kapatana kadar açık.';

-- Sipariş: kapatma + kurye + oturum
alter table public.orders
  add column if not exists closed_at timestamptz,
  add column if not exists closed_by_user_id uuid,
  add column if not exists courier_id uuid references public.couriers (id) on delete set null,
  add column if not exists table_session_id uuid references public.table_sessions (id) on delete set null;

comment on column public.orders.closed_at is 'Kasiyer ödemeyi alıp kapattığı an; null = açık.';
comment on column public.orders.courier_id is 'Kapatırda seçilen kurye (yalnızca kuryeli teslimat siparişleri).';

-- Mevcut kayıtlar: tamamlanmış / iptal = kapatılmış say
update public.orders
set closed_at = created_at
where closed_at is null
  and status in ('delivered', 'cancelled');

-- Garson masa siparişi: oturum ataması (SECURITY DEFINER, RLS atlanır)
create or replace function public.touch_table_session_for_order()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  sid uuid;
begin
  if new.order_channel = 'table'
     and new.table_number is not null
     and trim(new.table_number) <> ''
     and new.table_session_id is null then
    select ts.id into sid
    from public.table_sessions ts
    where ts.restaurant_id = new.restaurant_id
      and ts.table_number = trim(new.table_number)
      and ts.closed_at is null
    order by ts.opened_at desc
    limit 1;

    if sid is null then
      insert into public.table_sessions (restaurant_id, table_number)
      values (new.restaurant_id, trim(new.table_number))
      returning id into sid;
    end if;

    new.table_session_id := sid;
  end if;
  return new;
end;
$$;

drop trigger if exists tr_orders_touch_table_session on public.orders;
create trigger tr_orders_touch_table_session
  before insert on public.orders
  for each row
  execute procedure public.touch_table_session_for_order();

-- RLS: couriers
alter table public.couriers enable row level security;

drop policy if exists couriers_select_members on public.couriers;
drop policy if exists couriers_insert_members on public.couriers;
drop policy if exists couriers_update_members on public.couriers;
drop policy if exists couriers_delete_members on public.couriers;

create policy couriers_select_members on public.couriers
for select to authenticated
using (
  exists (
    select 1 from public.restaurant_members rm
    where rm.restaurant_id = couriers.restaurant_id
      and rm.user_id = auth.uid()
      and rm.is_active = true
  )
);

create policy couriers_insert_members on public.couriers
for insert to authenticated
with check (
  exists (
    select 1 from public.restaurant_members rm
    where rm.restaurant_id = couriers.restaurant_id
      and rm.user_id = auth.uid()
      and rm.is_active = true
  )
);

create policy couriers_update_members on public.couriers
for update to authenticated
using (
  exists (
    select 1 from public.restaurant_members rm
    where rm.restaurant_id = couriers.restaurant_id
      and rm.user_id = auth.uid()
      and rm.is_active = true
  )
)
with check (
  exists (
    select 1 from public.restaurant_members rm
    where rm.restaurant_id = couriers.restaurant_id
      and rm.user_id = auth.uid()
      and rm.is_active = true
  )
);

create policy couriers_delete_members on public.couriers
for delete to authenticated
using (
  exists (
    select 1 from public.restaurant_members rm
    where rm.restaurant_id = couriers.restaurant_id
      and rm.user_id = auth.uid()
      and rm.is_active = true
  )
);

-- RLS: table_sessions (yalnız üyeler; ekleme tetikleyicide)
alter table public.table_sessions enable row level security;

drop policy if exists table_sessions_select_members on public.table_sessions;
drop policy if exists table_sessions_update_members on public.table_sessions;

create policy table_sessions_select_members on public.table_sessions
for select to authenticated
using (
  exists (
    select 1 from public.restaurant_members rm
    where rm.restaurant_id = table_sessions.restaurant_id
      and rm.user_id = auth.uid()
      and rm.is_active = true
  )
);

create policy table_sessions_update_members on public.table_sessions
for update to authenticated
using (
  exists (
    select 1 from public.restaurant_members rm
    where rm.restaurant_id = table_sessions.restaurant_id
      and rm.user_id = auth.uid()
      and rm.is_active = true
  )
)
with check (
  exists (
    select 1 from public.restaurant_members rm
    where rm.restaurant_id = table_sessions.restaurant_id
      and rm.user_id = auth.uid()
      and rm.is_active = true
  )
);
