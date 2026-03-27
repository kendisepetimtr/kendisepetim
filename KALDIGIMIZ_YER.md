# KendiSepetim - Kaldigimiz Yer

Bu dosya, projeyi baska bir bilgisayarda clone ettikten sonra hizli devam edebilmek icin olusturuldu.

## Durum Ozeti

MVP gelistirme adimlarinin buyuk kismi kodlandi:

- Multi-tenant middleware (subdomain -> `/t/[tenant]`) mevcut.
- Supabase client yapisi (server/client/middleware) mevcut.
- Tenant menu, cart, checkout akisi mevcut.
- Checkout server action ile `orders` + `order_items` olusturma mevcut.
- Dashboard auth + membership (`restaurant_members`) kontrolu mevcut.
- Dashboard:
  - Categories CRUD
  - Products CRUD
  - Settings
  - Orders list + status update
  - Order detail + status update
  - Orders list icin basic Supabase Realtime refresh

## En Son Tamamlanan Adim

**Adim 1 (proje calistirma altyapisi) tamamlandi.**

Kurulanlar:

- `package.json`
- `next.config.ts`
- `tsconfig.json`
- `next-env.d.ts`
- `postcss.config.js`
- `tailwind.config.ts`
- `.gitignore`
- runtime + dev dependencies

Not:

- `dev` script su an `next dev --webpack` kullaniyor (ortam uyumlulugu icin).

## Siradaki Adim (Adim 2)

Proje kokunde `.env.local` olusturup doldur:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_ROOT_DOMAIN=kendisepetim.com
```

## Devam Etmeden Once Kontrol

1. Projeyi clone et.
2. Klasore gir.
3. Paketleri kur:
   - `npm install`
4. `.env.local` ekle.
5. Calistir:
   - `npm run dev`

## Sonraki Teknik Adimlar (Plan)

1. SQL migrationlari Supabase'de uygulamak (mevcut tablo/alanlarla kodu birebir eslemek):
   - `restaurants`
   - `restaurant_domains`
   - `restaurant_members`
   - `categories`
   - `products`
   - `orders`
   - `order_items`
2. Seed/test verisi eklemek:
   - en az 1 restoran
   - restoran domain kaydi
   - 1 dashboard kullanicisi + membership
   - kategori/urun ornekleri
3. Realtime kontrol:
   - `orders` tablosu icin Realtime aktif mi kontrol et.
4. E2E elle test:
   - `/`
   - `/t/[tenant]` -> cart -> checkout
   - `/login` -> `/dashboard`
   - categories/products/settings
   - `/dashboard/orders` + detail + status

## Bilinen Notlar

- `order_items` tablosunda kodun bekledigi alanlar:
  - `product_name_snapshot`
  - `unit_price`
  - `quantity`
  - `line_total`
- `restaurants` tablosunda kodun bekledigi alanlar:
  - `logo_url`
  - `brand_color`
- Dashboard restoran secimi su an "ilk aktif membership" mantigiyla calisir.

## Hizli Baslangic Komutlari

```bash
npm install
npm run dev
```

