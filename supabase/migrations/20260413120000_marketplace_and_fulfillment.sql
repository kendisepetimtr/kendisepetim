/*
  Marketplace vitrini, restoran konumu / teslimat yarıçapı ve sipariş tipi (gel-al / teslimat).
*/

create type public.order_fulfillment_type as enum ('pickup', 'delivery');

alter table public.tenants
  add column if not exists marketplace_enabled boolean not null default false,
  add column if not exists city text not null default '',
  add column if not exists district text not null default '',
  add column if not exists neighborhood text not null default '',
  add column if not exists cuisine_tags text[] not null default '{}'::text[],
  add column if not exists latitude numeric(10, 7),
  add column if not exists longitude numeric(10, 7),
  add column if not exists delivery_radius_km numeric(5, 2) not null default 5,
  add column if not exists fulfillment_pickup_enabled boolean not null default true,
  add column if not exists fulfillment_delivery_enabled boolean not null default false,
  add column if not exists min_order_amount numeric(12, 2);

alter table public.tenants
  drop constraint if exists tenants_delivery_radius_km_range;

alter table public.tenants
  add constraint tenants_delivery_radius_km_range
  check (delivery_radius_km >= 1 and delivery_radius_km <= 15);

alter table public.tenants
  drop constraint if exists tenants_min_order_amount_nonnegative;

alter table public.tenants
  add constraint tenants_min_order_amount_nonnegative
  check (min_order_amount is null or min_order_amount >= 0);

alter table public.tenants
  drop constraint if exists tenants_lat_lng_pair;

alter table public.tenants
  add constraint tenants_lat_lng_pair
  check (
    (latitude is null and longitude is null)
    or (latitude is not null and longitude is not null)
  );

comment on column public.tenants.marketplace_enabled is 'Restoran opt-in: marketplace vitrininde listelenir';
comment on column public.tenants.city is 'Marketplace il (or. Antalya)';
comment on column public.tenants.district is 'Marketplace ilce (or. Muratpasa)';
comment on column public.tenants.neighborhood is 'Marketplace mahalle';
comment on column public.tenants.cuisine_tags is 'Mutfak etiketleri (burger, kebap vb.)';
comment on column public.tenants.latitude is 'Restoran konumu — harita pini';
comment on column public.tenants.longitude is 'Restoran konumu — harita pini';
comment on column public.tenants.delivery_radius_km is 'Restoran teslimat yariçapi (1-15 km)';
comment on column public.tenants.fulfillment_pickup_enabled is 'Gel-al siparis kabul';
comment on column public.tenants.fulfillment_delivery_enabled is 'Restoran teslimati kabul';
comment on column public.tenants.min_order_amount is 'Opsiyonel minimum siparis tutari (teslimat)';

alter table public.orders
  add column if not exists fulfillment_type public.order_fulfillment_type not null default 'delivery',
  add column if not exists customer_latitude numeric(10, 7),
  add column if not exists customer_longitude numeric(10, 7);

comment on column public.orders.fulfillment_type is 'Gel-al veya restoran teslimati';
comment on column public.orders.customer_latitude is 'Teslimat konum dogrulama';
comment on column public.orders.customer_longitude is 'Teslimat konum dogrulama';

alter table public.orders
  drop constraint if exists orders_order_source_check;

alter table public.orders
  add constraint orders_order_source_check
  check (order_source in ('qr_menu', 'marketplace'));

create index if not exists tenants_marketplace_list_idx
  on public.tenants (marketplace_enabled, city, district, neighborhood)
  where marketplace_enabled = true and public_menu_enabled = true;
