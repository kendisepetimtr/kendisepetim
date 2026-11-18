-- Kategori bazlı kestirme ürün notları (POS / kasa için fare ile seçim)

alter table public.menu_categories
  add column if not exists note_presets text[] not null default '{}'::text[];

comment on column public.menu_categories.note_presets is
  'Kasa/ops ürün notu kestirmeleri (örn. Az soğanlı, Bol soğanlı). Fiyatsız; mutfak notuna gider.';
