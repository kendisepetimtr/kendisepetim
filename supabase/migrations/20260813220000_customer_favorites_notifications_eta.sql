/*
  Müşteri favorileri, sipariş bildirimleri, restoran ETA / otomatik durum süreleri.
*/

-- Favoriler (restoran + ürün)
create table if not exists public.customer_favorites (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null references public.customer_profiles (user_id) on delete cascade,
  kind text not null check (kind in ('restaurant', 'product')),
  subdomain text not null,
  product_id text,
  product_name text not null default '',
  restaurant_name text not null default '',
  constraint customer_favorites_product_id_chk check (
    (kind = 'restaurant' and product_id is null)
    or (kind = 'product' and product_id is not null)
  )
);

create unique index if not exists customer_favorites_restaurant_uidx
  on public.customer_favorites (user_id, subdomain)
  where kind = 'restaurant';

create unique index if not exists customer_favorites_product_uidx
  on public.customer_favorites (user_id, subdomain, product_id)
  where kind = 'product';

create index if not exists customer_favorites_user_idx
  on public.customer_favorites (user_id, created_at desc);

alter table public.customer_favorites enable row level security;

drop policy if exists customer_favorites_own_all on public.customer_favorites;
create policy customer_favorites_own_all
  on public.customer_favorites
  for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Sipariş bildirimleri (müşteri paneli / chat)
create table if not exists public.customer_order_notifications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null references auth.users (id) on delete cascade,
  order_id uuid references public.orders (id) on delete cascade,
  order_code text not null default '',
  subdomain text not null default '',
  restaurant_name text not null default '',
  title text not null,
  body text not null,
  stage text not null default 'received',
  source text not null default 'manual' check (source in ('manual', 'auto', 'system')),
  scheduled_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz
);

create index if not exists customer_order_notifications_user_idx
  on public.customer_order_notifications (user_id, created_at desc);

create index if not exists customer_order_notifications_due_idx
  on public.customer_order_notifications (scheduled_at)
  where delivered_at is null and scheduled_at is not null;

alter table public.customer_order_notifications enable row level security;

drop policy if exists customer_order_notifications_own_select on public.customer_order_notifications;
create policy customer_order_notifications_own_select
  on public.customer_order_notifications
  for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists customer_order_notifications_own_update on public.customer_order_notifications;
create policy customer_order_notifications_own_update
  on public.customer_order_notifications
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Restoran ETA / otomatik bildirim ayarları
alter table public.tenants
  add column if not exists order_eta_auto_enabled boolean not null default false;

alter table public.tenants
  add column if not exists order_eta_mode text not null default 'total';

alter table public.tenants
  drop constraint if exists tenants_order_eta_mode_chk;

alter table public.tenants
  add constraint tenants_order_eta_mode_chk
  check (order_eta_mode in ('total', 'stages'));

alter table public.tenants
  add column if not exists order_eta_total_minutes integer not null default 15;

alter table public.tenants
  add column if not exists order_eta_prep_minutes integer not null default 10;

alter table public.tenants
  add column if not exists order_eta_ready_minutes integer not null default 12;

alter table public.tenants
  add column if not exists order_eta_dispatch_minutes integer not null default 15;

alter table public.tenants
  add column if not exists order_eta_deliver_minutes integer not null default 30;

comment on column public.tenants.order_eta_auto_enabled is
  'Açıksa sipariş sonrası dakika bazlı otomatik müşteri bildirimleri planlanır.';
comment on column public.tenants.order_eta_mode is
  'total = tek süre (yola çıktı); stages = hazırlanıyor/hazır/yolda/teslim ayrı süreler.';
