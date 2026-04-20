alter table public.tenants
  add column if not exists cover_image_url text,
  add column if not exists public_description text not null default '',
  add column if not exists google_maps_url text,
  add column if not exists seo_index_enabled boolean not null default false;

comment on column public.tenants.cover_image_url is 'QR menu header/kapak gorseli';
comment on column public.tenants.public_description is 'QR menu ve SEO icin restoran aciklamasi';
comment on column public.tenants.google_maps_url is 'QR menu icin Google Maps konum linki';
comment on column public.tenants.seo_index_enabled is 'Public QR menu arama motorlarinda indexlenebilir mi';

alter table public.menu_products
  add column if not exists warning_preset_keys text[] not null default '{}'::text[],
  add column if not exists custom_warning_tags jsonb not null default '[]'::jsonb;

alter table public.menu_products
  drop constraint if exists menu_products_custom_warning_tags_is_array;

alter table public.menu_products
  add constraint menu_products_custom_warning_tags_is_array
  check (jsonb_typeof(custom_warning_tags) = 'array');

comment on column public.menu_products.warning_preset_keys is 'Hazir urun uyari/alergen anahtarlari';
comment on column public.menu_products.custom_warning_tags is 'Ozel uyari etiketleri JSON listesi';
