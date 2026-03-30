-- Faz 1: içindekiler (satır satır → json dizi), paket/online ikinci fiyat, görsel object path
-- Supabase SQL Editor veya migration ile çalıştırın.

alter table public.products
  add column if not exists ingredients jsonb not null default '[]'::jsonb,
  add column if not exists delivery_price numeric(12, 2),
  add column if not exists use_delivery_price boolean not null default false,
  add column if not exists image_storage_path text;

alter table public.products
  drop constraint if exists products_delivery_price_when_flag_chk;

alter table public.products
  add constraint products_delivery_price_when_flag_chk
  check (
    not use_delivery_price
    or (delivery_price is not null and delivery_price >= 0)
  );

create index if not exists products_image_storage_path_idx
  on public.products (image_storage_path)
  where image_storage_path is not null;
