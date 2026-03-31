-- Restoran bazında sipariş kanal görünürlüğü/aktifliği
alter table public.restaurants
  add column if not exists enable_table_orders boolean not null default true,
  add column if not exists enable_package_orders boolean not null default true;

comment on column public.restaurants.enable_table_orders is
  'Dashboard ve kasa akışında masa siparişi özelliği aktif/pasif.';
comment on column public.restaurants.enable_package_orders is
  'Dashboard ve kasa akışında paket siparişi özelliği aktif/pasif.';
