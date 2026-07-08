/*
  Ürün varyasyonları / seçenekleri (porsiyon, ilave malzeme vb.).
  custom_warning_tags deseni: ürün satırında jsonb olarak saklanır (grup -> seçenek).
  Sipariş satırında seçilen varyasyonlar + fiyat farkı snapshot olarak tutulur.
*/

alter table public.menu_products
  add column if not exists variation_groups jsonb not null default '[]'::jsonb;

alter table public.menu_products
  drop constraint if exists menu_products_variation_groups_is_array;

alter table public.menu_products
  add constraint menu_products_variation_groups_is_array
  check (jsonb_typeof(variation_groups) = 'array');

comment on column public.menu_products.variation_groups is
  'Müşteri seçimli varyasyon grupları (porsiyon, ilave). Her seçenek priceDelta taşır.';

alter table public.order_lines
  add column if not exists selected_options jsonb not null default '[]'::jsonb;

alter table public.order_lines
  drop constraint if exists order_lines_selected_options_is_array;

alter table public.order_lines
  add constraint order_lines_selected_options_is_array
  check (jsonb_typeof(selected_options) = 'array');

comment on column public.order_lines.selected_options is
  'Sipariş anında seçilen varyasyonlar (grup/seçenek adı + fiyat farkı) snapshot.';
