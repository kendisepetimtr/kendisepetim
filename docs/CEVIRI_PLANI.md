# QR Menü Çeviri & AI Açıklama Planı

> Durum: **Beklemede / ileride yapılacak.** Karar verildi, geliştirme sonraya ertelendi.
> Seçilen çeviri motoru: **DeepL API Free** (500.000 karakter/ay ücretsiz kota).

## Amaç

1. **Müşteri tarafı:** QR menüyü yabancı müşterilere kendi dilinde göstermek.
2. **İşletme tarafı:** Panelde ürün açıklaması oluşturma / çevirme.

## Temel Mimari Kararı: "Yazarken çevir + sakla" (cache)

Menü **bir kere yazılır, binlerce kere okunur**. Bu yüzden çeviri, müşteri menüyü
açtığında değil, **işletme ürünü kaydettiğinde bir kez** yapılır ve DB'ye yazılır.

- Runtime (her ziyarette çevir) → ❌ yavaş, pahalı, rate-limit riski.
- Cache (kaydederken çevir, DB'ye yaz) → ✅ anında servis, maliyet ~0.

Maliyet matematiği: 100 ürünlük menü ≈ 30.000 karakter. 5 dile = 150.000 karakter,
**düzenleme başına bir kez**. DeepL Free 500K/ay kotası birçok işletmeye yeter.

## Fiyatlandırma / Monetizasyon Haritası

| Plan | Çeviri özelliği | Bize maliyeti |
|---|---|---|
| Ücretsiz plan | Sadece tarayıcı çevirisi | 0 |
| Premium plan | Cache'li profesyonel çok dilli menü (DeepL) + AI açıklama | ~0 (cache + free tier) |

## Yapılacaklar

### Faz 1 — Tarayıcı çevirisi (hızlı, ücretsiz, altyapısız)
- [ ] QR menüde küçük "🌐 Dil / Language" ipucu (tarayıcının kendi çevirisine yönlendirir).
- [ ] Yemek adlarına `translate="no"` (İskender, Adana vb. korunur, bozuk çeviri engellenir).

### Faz 2 — Cache'li DeepL çevirisi (premium özellik)
- [ ] **DeepL API Free anahtarı** temin et (env: `DEEPL_API_KEY`), free endpoint `api-free.deepl.com`.
- [ ] **DB:** çeviri tabloları
  - `menu_product_translations (product_id, locale, name, description, ingredients, updated_at)`
  - `menu_category_translations (category_id, locale, name, description, updated_at)`
  - tenant `public_description` çevirisi (ayrı tablo veya aynı desen).
  - RLS: mevcut menu_catalog deseni izlenecek (public read = hidden=false + public_menu_enabled).
- [ ] **Çeviri servisi:** `/api/dashboard/translate` benzeri sunucu route'u; DeepL'e istek atar.
  - Ürün/kategori kaydedilince (`lib/dashboard/menu-mutations.ts`) arka planda hedef dillere çevirip cache'ler.
  - Düzenlemede ilgili satır yeniden çevrilir (updated_at karşılaştırması).
- [ ] **Servis noktası:** `lib/menu-map.ts` — aktif locale varsa çeviri tablosundaki metni koy,
  yoksa Türkçe orijinale düş. (Tek chokepoint; public menü + panel otomatik yararlanır.)
- [ ] **Locale çözümü:** QR menüde marka içi dil seçici; seçim cookie'ye yazılır, sunucu bileşeni okur.
- [ ] **Uyarı/alerjen etiketleri:** `lib/menu-product-warnings.ts` preset'leri kod içinde çevrilir (DB değil).

### Faz 3 — AI açıklama üretimi (opsiyonel, ayrı motor)
- [ ] Not: DeepL sadece **çeviri** yapar, **üretim** yapmaz. Açıklama üretimi için ayrı bir LLM gerekir
  (Google Gemini free tier veya Groq). Karar sonraya bırakıldı.
- [ ] `components/dashboard/product-form-modal.tsx` içine "AI ile açıklama oluştur" butonu
  (ürün adı + malzemeden 1-2 cümle üretir).

## Hedef Diller (başlangıç önerisi)
- İngilizce + Arapça + Rusça (turistik). Sonradan genişletilebilir.
- Not: DeepL Arapça'yı **desteklemiyor** (kontrol edilecek). Arapça gerekiyorsa o dil için
  alternatif motor (Azure/Google) veya tarayıcı çevirisi devreye alınmalı.

## İlgili Dosyalar (referans)
- Veri modeli: `supabase/migrations/20260411153000_menu_catalog.sql`
- DB tipleri: `lib/supabase/menu-types.ts`, `lib/local-menu.ts`
- Dönüşüm chokepoint: `lib/menu-map.ts`
- Public QR menü (server): `app/m/[slug]/page.tsx`
- Public menü UI (client): `components/public-menu/public-menu-client.tsx`
- Ürün editörü: `components/dashboard/product-form-modal.tsx`
- Kategori editörü: `components/dashboard/category-edit-modal.tsx`
- Kayıt/mutasyon: `lib/dashboard/menu-mutations.ts`, `app/api/dashboard/menu/route.ts`

## Açık Sorular (dönünce netleştirilecek)
- DeepL Free'nin desteklediği diller (özellikle Arapça durumu).
- Dil seçici UI konumu ve varsayılan dil davranışı.
- Çeviri arka planda mı (kaydet hızlı kalsın) yoksa senkron mu tetiklenecek?
