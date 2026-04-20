# Menü SQL planı

Bu belge, kategori ve ürünleri localStorage yerine Supabase üzerinde saklamaya geçişin ilk adımı olan veritabanı şemasını açıklar.

## Oluşturulan tablolar

- public.menu_categories
- public.menu_products

İkisi de 	enant_id ile public.tenants tablosuna bağlıdır.

## Neden bu yapı?

- 	enant_id: Her sorguda işletmeye göre filtreleme ve RLS için gerekli.
- category_id nullable: Kategori silinince ürünler kaybolmasın; mevcut arayüzdeki  Kategorisiz ürünler davranışı korunsun.
- hidden: QR/public menüde gösterimi kapatmak için.
- sort_order: Kategori ve ileride ürün sırası için.
- signature_dish: Aynı anda tek öne çıkan ürün. DB tarafında unique partial index ile korunur.
- checkout_upsell: Sepette önerilen ürünler için hazır alan.
- image_url: Ürün görselinin Supabase Storage public URL'si veya dosya adresi.

## RLS özeti

### İşletme sahibi

uth.uid() ile 	enants.owner_user_id eşleşiyorsa:
- kendi kategorilerini okuyabilir / ekleyebilir / güncelleyebilir / silebilir
- kendi ürünlerini okuyabilir / ekleyebilir / güncelleyebilir / silebilir

### Anonim / public menü

Anonim kullanıcı yalnızca şunları görebilir:
- 	enants.public_menu_enabled = true
- hidden = false
- ürün için ayrıca bağlı kategori de görünür olmalı

Bu sayede süperadmin QR menüyü kapattığında, aynı tenant'ın public menü sorguları da otomatik olarak boş dönebilir.

## Senin yapman gereken

1. Supabase SQL Editor'da yeni migration dosyasını çalıştır.
2. Hata yoksa Table Editor'da iki tabloyu kontrol et.
3. Sonra bir sonraki adımda uygulama kodunu local-menu yerine bu tablolara bağlayacağız.

## Henüz yapılmadı

- Storage'daki eski/boşta kalan görsellerin temizlenmesi
- Ürün varyasyonları / seçenek grupları / stok
