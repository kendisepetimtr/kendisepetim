-- Faz 1: garson pin/masa ayarı + sipariş kanal ayrımı
alter table public.restaurants
  add column if not exists waiter_pin text,
  add column if not exists table_count integer;

comment on column public.restaurants.waiter_pin is
  'Garson giriş PIN kodu (faz1: 4 hane).';
comment on column public.restaurants.table_count is
  'Restoranın aktif masa sayısı.';

alter table public.orders
  add column if not exists order_channel text not null default 'online';

comment on column public.orders.order_channel is
  'Sipariş kaynağı: online | table | package';
