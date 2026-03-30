-- Restoran logosu: Storage nesne yolu (dosya yukleme + silme)
alter table public.restaurants
  add column if not exists logo_storage_path text;

create index if not exists restaurants_logo_storage_path_idx
  on public.restaurants (logo_storage_path)
  where logo_storage_path is not null;
