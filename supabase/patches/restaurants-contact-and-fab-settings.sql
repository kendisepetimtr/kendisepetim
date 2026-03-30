-- Restoran açıklaması ve müşteri menüsü FAB iletişim ayarları
alter table public.restaurants
  add column if not exists description text,
  add column if not exists fab_call_enabled boolean not null default false,
  add column if not exists fab_call_phone text,
  add column if not exists fab_whatsapp_enabled boolean not null default false,
  add column if not exists fab_whatsapp_phone text,
  add column if not exists fab_location_enabled boolean not null default false,
  add column if not exists fab_location_lat double precision,
  add column if not exists fab_location_lng double precision;

comment on column public.restaurants.description is
  'Restoran sloganı / kısa açıklaması (menü üst alanında kullanılır).';
comment on column public.restaurants.fab_call_enabled is
  'Müşteri menüsünde FAB arama butonunu aktif eder.';
comment on column public.restaurants.fab_call_phone is
  'FAB arama butonu için telefon numarası (tel:).';
comment on column public.restaurants.fab_whatsapp_enabled is
  'Müşteri menüsünde FAB WhatsApp butonunu aktif eder.';
comment on column public.restaurants.fab_whatsapp_phone is
  'FAB WhatsApp butonu için telefon numarası (wa.me).';
comment on column public.restaurants.fab_location_enabled is
  'Müşteri menüsünde FAB konum butonunu aktif eder.';
comment on column public.restaurants.fab_location_lat is
  'Restoran konum enlemi (Google Maps yönlendirmesi).';
comment on column public.restaurants.fab_location_lng is
  'Restoran konum boylamı (Google Maps yönlendirmesi).';
