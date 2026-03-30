-- =============================================================================
-- KendiSepetim — demo restoran + örnek menü + Realtime (orders)
-- Supabase → SQL → New query → sırayla çalıştır (tek seferde de olur).
--
-- 1) Authentication → Users ile bir kullanıcı oluştur.
-- 2) Üyelik satırındaki user_id bu projedeki dashboard kullanıcısıdır (gerekirse güncelle).
-- 3) Bu dosyanın tamamını çalıştır.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Realtime: dashboard sipariş listesi INSERT dinlemesi için
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table public.orders;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Demo restoran (slug: demo → http://localhost:3000/t/demo)
-- ---------------------------------------------------------------------------
insert into public.restaurants (name, slug, logo_url, brand_color, is_active)
values ('Demo Restoran', 'demo', null, '#111827', true)
on conflict (slug) do update
set
  name = excluded.name,
  brand_color = excluded.brand_color,
  is_active = excluded.is_active;

-- ---------------------------------------------------------------------------
-- Üyelik
-- ---------------------------------------------------------------------------
insert into public.restaurant_members (restaurant_id, user_id, role, is_active)
select r.id, '0381394f-7a63-4d3a-b594-6af00d54bc99'::uuid, 'owner', true
from public.restaurants r
where r.slug = 'demo'
on conflict (restaurant_id, user_id) do update
set
  role = excluded.role,
  is_active = excluded.is_active;

-- ---------------------------------------------------------------------------
-- Kategoriler (tekrar çalışınca çoğalmaz)
-- ---------------------------------------------------------------------------
insert into public.categories (restaurant_id, name, description, sort_order, is_active)
select r.id, 'İçecekler', 'Serinletici içecekler', 1, true
from public.restaurants r
where r.slug = 'demo'
  and not exists (
    select 1
    from public.categories c
    where c.restaurant_id = r.id
      and c.name = 'İçecekler'
  );

insert into public.categories (restaurant_id, name, description, sort_order, is_active)
select r.id, 'Ana yemek', null, 2, true
from public.restaurants r
where r.slug = 'demo'
  and not exists (
    select 1
    from public.categories c
    where c.restaurant_id = r.id
      and c.name = 'Ana yemek'
  );

-- ---------------------------------------------------------------------------
-- Ürünler (tekrar çalışınca çoğalmaz — isim + restoran ile kontrol)
-- ---------------------------------------------------------------------------
insert into public.products (
  restaurant_id,
  category_id,
  name,
  description,
  price,
  image_url,
  sort_order,
  is_active
)
select
  r.id,
  c.id,
  'Ayran',
  '300 ml',
  45.00,
  null,
  1,
  true
from public.restaurants r
join public.categories c on c.restaurant_id = r.id and c.name = 'İçecekler'
where r.slug = 'demo'
  and not exists (
    select 1
    from public.products p
    where p.restaurant_id = r.id
      and p.name = 'Ayran'
  );

insert into public.products (
  restaurant_id,
  category_id,
  name,
  description,
  price,
  image_url,
  sort_order,
  is_active
)
select
  r.id,
  c.id,
  'Kola',
  '330 ml kutu',
  55.00,
  null,
  2,
  true
from public.restaurants r
join public.categories c on c.restaurant_id = r.id and c.name = 'İçecekler'
where r.slug = 'demo'
  and not exists (
    select 1
    from public.products p
    where p.restaurant_id = r.id
      and p.name = 'Kola'
  );

insert into public.products (
  restaurant_id,
  category_id,
  name,
  description,
  price,
  image_url,
  sort_order,
  is_active
)
select
  r.id,
  c.id,
  'Izgara köfte',
  'Pilav ve salata ile',
  320.00,
  null,
  1,
  true
from public.restaurants r
join public.categories c on c.restaurant_id = r.id and c.name = 'Ana yemek'
where r.slug = 'demo'
  and not exists (
    select 1
    from public.products p
    where p.restaurant_id = r.id
      and p.name = 'Izgara köfte'
  );

insert into public.products (
  restaurant_id,
  category_id,
  name,
  description,
  price,
  image_url,
  sort_order,
  is_active
)
select
  r.id,
  c.id,
  'Mercimek çorbası',
  'Günün çorbası',
  95.00,
  null,
  2,
  true
from public.restaurants r
join public.categories c on c.restaurant_id = r.id and c.name = 'Ana yemek'
where r.slug = 'demo'
  and not exists (
    select 1
    from public.products p
    where p.restaurant_id = r.id
      and p.name = 'Mercimek çorbası'
  );

-- ---------------------------------------------------------------------------
-- Ek demo kategoriler + ürünler (demo.localhost / slug demo menüsü dolu kalsın)
-- Tekrar çalıştırılabilir: aynı isimli kategori/ürün atlanır.
-- ---------------------------------------------------------------------------
insert into public.categories (restaurant_id, name, description, sort_order, is_active)
select r.id, 'Çorbalar', 'Sıcacık çorba çeşitleri', 3, true
from public.restaurants r
where r.slug = 'demo'
  and not exists (
    select 1 from public.categories c
    where c.restaurant_id = r.id and c.name = 'Çorbalar'
  );

insert into public.categories (restaurant_id, name, description, sort_order, is_active)
select r.id, 'Makarnalar', 'Fırından tabağa', 4, true
from public.restaurants r
where r.slug = 'demo'
  and not exists (
    select 1 from public.categories c
    where c.restaurant_id = r.id and c.name = 'Makarnalar'
  );

insert into public.categories (restaurant_id, name, description, sort_order, is_active)
select r.id, 'Salatalar', 'Taze ve hafif', 5, true
from public.restaurants r
where r.slug = 'demo'
  and not exists (
    select 1 from public.categories c
    where c.restaurant_id = r.id and c.name = 'Salatalar'
  );

insert into public.categories (restaurant_id, name, description, sort_order, is_active)
select r.id, 'Ara sıcaklar', 'Paylaşımlık lezzetler', 6, true
from public.restaurants r
where r.slug = 'demo'
  and not exists (
    select 1 from public.categories c
    where c.restaurant_id = r.id and c.name = 'Ara sıcaklar'
  );

insert into public.categories (restaurant_id, name, description, sort_order, is_active)
select r.id, 'Tatlılar', 'Tatlı kaçamaklar', 7, true
from public.restaurants r
where r.slug = 'demo'
  and not exists (
    select 1 from public.categories c
    where c.restaurant_id = r.id and c.name = 'Tatlılar'
  );

-- Çorbalar
insert into public.products (restaurant_id, category_id, name, description, price, image_url, sort_order, is_active)
select r.id, c.id, 'Ezogelin çorbası', 'Geleneksel tarif', 88.00, null, 1, true
from public.restaurants r
join public.categories c on c.restaurant_id = r.id and c.name = 'Çorbalar'
where r.slug = 'demo'
  and not exists (select 1 from public.products p where p.restaurant_id = r.id and p.name = 'Ezogelin çorbası');

insert into public.products (restaurant_id, category_id, name, description, price, image_url, sort_order, is_active)
select r.id, c.id, 'Yoğurt çorbası', 'Nane ve sumaklı', 92.00, null, 2, true
from public.restaurants r
join public.categories c on c.restaurant_id = r.id and c.name = 'Çorbalar'
where r.slug = 'demo'
  and not exists (select 1 from public.products p where p.restaurant_id = r.id and p.name = 'Yoğurt çorbası');

insert into public.products (restaurant_id, category_id, name, description, price, image_url, sort_order, is_active)
select r.id, c.id, 'Tarhana çorbası', 'Ev yapımı', 85.00, null, 3, true
from public.restaurants r
join public.categories c on c.restaurant_id = r.id and c.name = 'Çorbalar'
where r.slug = 'demo'
  and not exists (select 1 from public.products p where p.restaurant_id = r.id and p.name = 'Tarhana çorbası');

-- Makarnalar
insert into public.products (restaurant_id, category_id, name, description, price, image_url, sort_order, is_active)
select r.id, c.id, 'Spagetti napoliten', 'Domates sos, fesleğen', 195.00, null, 1, true
from public.restaurants r
join public.categories c on c.restaurant_id = r.id and c.name = 'Makarnalar'
where r.slug = 'demo'
  and not exists (select 1 from public.products p where p.restaurant_id = r.id and p.name = 'Spagetti napoliten');

insert into public.products (restaurant_id, category_id, name, description, price, image_url, sort_order, is_active)
select r.id, c.id, 'Penne alfredo', 'Kremalı mantar', 220.00, null, 2, true
from public.restaurants r
join public.categories c on c.restaurant_id = r.id and c.name = 'Makarnalar'
where r.slug = 'demo'
  and not exists (select 1 from public.products p where p.restaurant_id = r.id and p.name = 'Penne alfredo');

insert into public.products (restaurant_id, category_id, name, description, price, image_url, sort_order, is_active)
select r.id, c.id, 'Fettuccine bolonez', 'Kıymalı klasik', 210.00, null, 3, true
from public.restaurants r
join public.categories c on c.restaurant_id = r.id and c.name = 'Makarnalar'
where r.slug = 'demo'
  and not exists (select 1 from public.products p where p.restaurant_id = r.id and p.name = 'Fettuccine bolonez');

-- Salatalar
insert into public.products (restaurant_id, category_id, name, description, price, image_url, sort_order, is_active)
select r.id, c.id, 'Yeşil salata', 'Zeytinyağı ve limon', 120.00, null, 1, true
from public.restaurants r
join public.categories c on c.restaurant_id = r.id and c.name = 'Salatalar'
where r.slug = 'demo'
  and not exists (select 1 from public.products p where p.restaurant_id = r.id and p.name = 'Yeşil salata');

insert into public.products (restaurant_id, category_id, name, description, price, image_url, sort_order, is_active)
select r.id, c.id, 'Çoban salata', 'Domates, salatalık, peynir', 135.00, null, 2, true
from public.restaurants r
join public.categories c on c.restaurant_id = r.id and c.name = 'Salatalar'
where r.slug = 'demo'
  and not exists (select 1 from public.products p where p.restaurant_id = r.id and p.name = 'Çoban salata');

insert into public.products (restaurant_id, category_id, name, description, price, image_url, sort_order, is_active)
select r.id, c.id, 'Roka salatası', 'Parmesan ve ceviz', 155.00, null, 3, true
from public.restaurants r
join public.categories c on c.restaurant_id = r.id and c.name = 'Salatalar'
where r.slug = 'demo'
  and not exists (select 1 from public.products p where p.restaurant_id = r.id and p.name = 'Roka salatası');

-- Ara sıcaklar
insert into public.products (restaurant_id, category_id, name, description, price, image_url, sort_order, is_active)
select r.id, c.id, 'Sigara böreği', '6 adet', 110.00, null, 1, true
from public.restaurants r
join public.categories c on c.restaurant_id = r.id and c.name = 'Ara sıcaklar'
where r.slug = 'demo'
  and not exists (select 1 from public.products p where p.restaurant_id = r.id and p.name = 'Sigara böreği');

insert into public.products (restaurant_id, category_id, name, description, price, image_url, sort_order, is_active)
select r.id, c.id, 'Patates kızartması', 'Çıtır dilimler', 95.00, null, 2, true
from public.restaurants r
join public.categories c on c.restaurant_id = r.id and c.name = 'Ara sıcaklar'
where r.slug = 'demo'
  and not exists (select 1 from public.products p where p.restaurant_id = r.id and p.name = 'Patates kızartması');

insert into public.products (restaurant_id, category_id, name, description, price, image_url, sort_order, is_active)
select r.id, c.id, 'Sosis tabağı', 'Patates kızartması ile', 145.00, null, 3, true
from public.restaurants r
join public.categories c on c.restaurant_id = r.id and c.name = 'Ara sıcaklar'
where r.slug = 'demo'
  and not exists (select 1 from public.products p where p.restaurant_id = r.id and p.name = 'Sosis tabağı');

-- Tatlılar
insert into public.products (restaurant_id, category_id, name, description, price, image_url, sort_order, is_active)
select r.id, c.id, 'Sütlaç', 'Fırınlanmış', 85.00, null, 1, true
from public.restaurants r
join public.categories c on c.restaurant_id = r.id and c.name = 'Tatlılar'
where r.slug = 'demo'
  and not exists (select 1 from public.products p where p.restaurant_id = r.id and p.name = 'Sütlaç');

insert into public.products (restaurant_id, category_id, name, description, price, image_url, sort_order, is_active)
select r.id, c.id, 'Kazandibi', 'Hafif tarçınlı', 95.00, null, 2, true
from public.restaurants r
join public.categories c on c.restaurant_id = r.id and c.name = 'Tatlılar'
where r.slug = 'demo'
  and not exists (select 1 from public.products p where p.restaurant_id = r.id and p.name = 'Kazandibi');

insert into public.products (restaurant_id, category_id, name, description, price, image_url, sort_order, is_active)
select r.id, c.id, 'Baklava', '2 dilim', 120.00, null, 3, true
from public.restaurants r
join public.categories c on c.restaurant_id = r.id and c.name = 'Tatlılar'
where r.slug = 'demo'
  and not exists (select 1 from public.products p where p.restaurant_id = r.id and p.name = 'Baklava');

-- İçecekler (ek çeşitler)
insert into public.products (restaurant_id, category_id, name, description, price, image_url, sort_order, is_active)
select r.id, c.id, 'Çay', 'Demlik', 25.00, null, 3, true
from public.restaurants r
join public.categories c on c.restaurant_id = r.id and c.name = 'İçecekler'
where r.slug = 'demo'
  and not exists (select 1 from public.products p where p.restaurant_id = r.id and p.name = 'Çay');

insert into public.products (restaurant_id, category_id, name, description, price, image_url, sort_order, is_active)
select r.id, c.id, 'Türk kahvesi', 'Orta şeker', 65.00, null, 4, true
from public.restaurants r
join public.categories c on c.restaurant_id = r.id and c.name = 'İçecekler'
where r.slug = 'demo'
  and not exists (select 1 from public.products p where p.restaurant_id = r.id and p.name = 'Türk kahvesi');

insert into public.products (restaurant_id, category_id, name, description, price, image_url, sort_order, is_active)
select r.id, c.id, 'Limonata', 'Ev yapımı', 70.00, null, 5, true
from public.restaurants r
join public.categories c on c.restaurant_id = r.id and c.name = 'İçecekler'
where r.slug = 'demo'
  and not exists (select 1 from public.products p where p.restaurant_id = r.id and p.name = 'Limonata');

-- Ana yemek (ek)
insert into public.products (restaurant_id, category_id, name, description, price, image_url, sort_order, is_active)
select r.id, c.id, 'Tavuk şiş', 'Pilav ve köz', 285.00, null, 3, true
from public.restaurants r
join public.categories c on c.restaurant_id = r.id and c.name = 'Ana yemek'
where r.slug = 'demo'
  and not exists (select 1 from public.products p where p.restaurant_id = r.id and p.name = 'Tavuk şiş');

insert into public.products (restaurant_id, category_id, name, description, price, image_url, sort_order, is_active)
select r.id, c.id, 'Kuzu tandır', 'Özel sos', 420.00, null, 4, true
from public.restaurants r
join public.categories c on c.restaurant_id = r.id and c.name = 'Ana yemek'
where r.slug = 'demo'
  and not exists (select 1 from public.products p where p.restaurant_id = r.id and p.name = 'Kuzu tandır');
