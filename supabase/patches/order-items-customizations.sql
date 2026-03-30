-- Online sipariş ürün özelleştirme alanları
alter table public.order_items
  add column if not exists removed_ingredients text[] default '{}',
  add column if not exists added_ingredients text[] default '{}',
  add column if not exists item_note text;

comment on column public.order_items.removed_ingredients is
  'Müşterinin ürün içinden çıkarmak istediği malzemeler.';
comment on column public.order_items.added_ingredients is
  'Müşterinin ürün için eklemek istediği malzemeler.';
comment on column public.order_items.item_note is
  'Ürün bazlı sipariş notu.';
