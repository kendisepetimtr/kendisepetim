-- Müşteri menüsü şablonu: m1, m3, m5, m6, m7, m8 (önizleme galerisi ile aynı kodlar).
alter table public.restaurants
  add column if not exists menu_layout text not null default 'm1';

comment on column public.restaurants.menu_layout is
  'Müşteri menü görünümü: m1 klasik, m3 koyu, m5 editorial, m6 OneQR, m7 minimal, m8 rustik.';
