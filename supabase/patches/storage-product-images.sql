-- =============================================================================
-- Urun gorselleri: Supabase Storage + (istege bagli) public.products alani
--
-- Uygulama: dosyayi yukleyip public URL uretir; products.image_url bu tam URL ile
-- guncellenir (sema degismeden de calisir).
--
-- Opsiyonel: asagidaki ALTER ile storage object key saklanir (silme/degistirme kolayligi).
--
-- NOT: storage.objects uzerinde "ALTER TABLE ... ENABLE ROW LEVEL SECURITY" CALISTIRMAYIN.
-- Hosted Supabase'te tablo sahibi ic roldur; 42501 "must be owner of table objects" verir.
-- RLS Storage icin zaten aciktir — sadece asagidaki policy'leri uygulayin.
-- Policy CREATE de yetki hatasi verirse: Dashboard > Storage > product-images > Policies
-- uzerinden ayni kurallari ekleyin veya supabase db push / migration (postgres rol).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) Bucket (Dashboard: Storage > New bucket ile de acilabilir)
--    public: menu sayfalari dogrudan <img src="..."> ile acilir.
--    ONEMLI: Sadece SELECT politikasi yetmez — bucket "Public" olmali
--    (Dashboard > product-images > ... > Make public). Aksi halde URL 404/kirilir.
--    private: uygulama signed URL uretir (biraz daha is, daha fazla kontrol).
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = excluded.public;

-- ---------------------------------------------------------------------------
-- 2) storage.objects RLS (uye sadece kendi restorani altindaki dosyalara)
--    Path onerisi: {restaurant_id}/{product_id}/{dosya}  (bucket: product-images)
--    (RLS zaten acik; ALTER TABLE storage.objects YAPILMAZ.)
-- ---------------------------------------------------------------------------
drop policy if exists "product_images_public_read" on storage.objects;
drop policy if exists "product_images_member_insert" on storage.objects;
drop policy if exists "product_images_member_update" on storage.objects;
drop policy if exists "product_images_member_delete" on storage.objects;

-- Herkes okuyabilsin (bucket public ise CDN URL zaten acik; politika tutarlilik icin)
create policy "product_images_public_read"
on storage.objects for select
using (bucket_id = 'product-images');

-- Ilk path segmenti = restaurant_id (uuid)
create policy "product_images_member_insert"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'product-images'
  and split_part(name, '/', 1) in (
    select rm.restaurant_id::text
    from public.restaurant_members rm
    where rm.user_id = auth.uid() and rm.is_active = true
  )
);

create policy "product_images_member_update"
on storage.objects for update to authenticated
using (
  bucket_id = 'product-images'
  and split_part(name, '/', 1) in (
    select rm.restaurant_id::text
    from public.restaurant_members rm
    where rm.user_id = auth.uid() and rm.is_active = true
  )
)
with check (
  bucket_id = 'product-images'
  and split_part(name, '/', 1) in (
    select rm.restaurant_id::text
    from public.restaurant_members rm
    where rm.user_id = auth.uid() and rm.is_active = true
  )
);

create policy "product_images_member_delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'product-images'
  and split_part(name, '/', 1) in (
    select rm.restaurant_id::text
    from public.restaurant_members rm
    where rm.user_id = auth.uid() and rm.is_active = true
  )
);

-- ---------------------------------------------------------------------------
-- 3) (OPSİYONEL) public.products — URL disinda object path
--    Uygulama: yukleme sonrasi hem image_url hem image_storage_path set edilir;
--    eski dosyayi silmek icin path yeterli olur.
-- ---------------------------------------------------------------------------
-- alter table public.products
--   add column if not exists image_storage_path text;

-- create index if not exists products_image_storage_path_idx
--   on public.products (image_storage_path)
--   where image_storage_path is not null;
