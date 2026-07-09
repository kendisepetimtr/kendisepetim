alter table public.orders
  add column if not exists courier_note text not null default '';

comment on column public.orders.order_note is 'Mutfak / hazırlık notu';
comment on column public.orders.courier_note is 'Kurye teslimat notu (kapı, zil, konum vb.)';
