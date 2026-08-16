/*
  QR menü Google yorum bağlantısı.
*/

alter table public.tenants
  add column if not exists google_reviews_url text;

comment on column public.tenants.google_reviews_url is
  'QR menü “Bizi değerlendirin” butonu — Google işletme / yorum sayfası';
