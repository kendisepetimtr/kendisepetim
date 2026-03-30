-- Tema: kapak, vurgu/yüzey renkleri, menü yazı tipleri (ana renk mevcut brand_color)
alter table public.restaurants
  add column if not exists cover_storage_path text,
  add column if not exists theme_accent text,
  add column if not exists theme_surface text,
  add column if not exists font_heading text not null default 'inter',
  add column if not exists font_body text not null default 'inter';

create index if not exists restaurants_cover_storage_path_idx
  on public.restaurants (cover_storage_path)
  where cover_storage_path is not null;
