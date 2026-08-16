# Menü fotoğrafından otomatik aktarım (plan)

**Durum:** Daha sonra — uygulanmadı  
**Amaç:** Ürün sayısı fazla restoranlarda menü kurulumunu hızlandırmak.  
**Pilot önceliği:** Bilinebilirlik / onboarding kolaylığı; kazanç değil.

Bu belge plan olarak durur. Geliştirirken veya sorarken buraya dönülebilir.

---

## Ürün vaadi

> Menünün fotoğrafını çekin → sistem **taslak** çıkarır → siz kontrol edip onaylarsınız.

Tam otomatik “dokunmadan yayın” vaat edilmez. Yanlış fiyat riski vardır; **insan onayı zorunlu**.

---

## V1 kapsamı (ilk sürüm)

Fotoğraftan çıkarılacaklar:

- kategori adı
- ürün adı
- fiyat
- (opsiyonel) kısa açıklama

V1 dışı:

- yemek ürün fotoğrafları (menü panosu ≠ yemek görseli)
- varyasyon / ekstra grupları
- alerjen etiketleri
- paket fiyatı / imza yemek bayrakları

Hedef tablolar: `menu_categories`, `menu_products` (mevcut şema).

---

## Akış

```text
1. Restoran 1–N menü fotoğrafı yükler
2. Görüntü sıkıştırılır (~1600px JPEG)
3. AI → yapılandırılmış JSON
4. Panelde “Menü taslağı” (düzenle / sil / birleştir)
5. Onay → kategoriler + ürünler kaydedilir
```

Önerilen JSON şema:

```json
{
  "categories": [
    {
      "name": "Ana Yemekler",
      "products": [
        { "name": "Izgara Köfte", "price": 280, "description": "" }
      ]
    }
  ]
}
```

---

## Önerilen altyapı (ucuz / ücretsiz öncelik)

| Öncelik | Araç | Not |
|--------|------|-----|
| **1 (pilot)** | Gemini Flash / Flash-Lite (Google AI Studio API) | Tek adımda vision + JSON; free tier ile başla |
| 2 | Google Cloud Vision OCR | Ayda ~1000 ücretsiz; sonra yine LLM gerekir |
| 3 | Tesseract / PaddleOCR (self-host) | API ücreti 0; doğruluk/bakım maliyeti yüksek — pilot için değil |

**Kaçın (şimdilik):** GPT-4o vision, Document AI SaaS, özel menü OCR startup’ları.

### Stack uyumu

- Upload: Supabase Storage (`menu-imports/{tenantId}/…`)
- API: örn. `POST /api/menu/import-from-photo`
- Taslak: `menu_import_drafts` (veya eşdeğeri) — onay öncesi
- UI: Dashboard menü → “Fotoğraftan aktar”
- Limit: tenant başına günde 5–10 foto (free tier koruması)
- Client sıkıştırma: küçük payload

### Maliyet (kaba)

- Pilot (~30 restoran × 4 foto/ay ≈ 120 görüntü): Gemini free ile **~0 ₺** hedeflenir
- Limit aşımında Flash-Lite paid hâlâ düşük maliyet

---

## Uygulama aşamaları

1. Süperadmin/test: tek foto → JSON preview
2. Tenant paneli: taslak düzenle → onay → DB
3. Çoklu foto birleştirme + yinelenen ürün birleştirme
4. Sonra: PDF / Excel import (fotoğraftan daha ucuz/doğru alternatif olabilir)

---

## Başarı kriteri

- Restoran menüyü elle sıfırdan kurmak yerine **dakikalar içinde taslak + düzeltme** ile açabiliyor
- Onaysız otomatik yayın yok
- Yanlış fiyat şikâyeti için kolay geri alma / toplu düzenleme düşünülür

---

## Açık sorular (sonra netleştir)

- Free Gemini kotası production’da yeterli mi, yoksa paid anahtar mı?
- Taslak kaç gün saklansın?
- Mevcut menünün üstüne mi yazılsın, yoksa “boş menüye aktar” mı?
- Türkçe fiyat formatları (`280₺`, `280 TL`, `1.250`) test seti

---

## İlgili sohbet notu

Karar tarihi: 2026-08-13 — planlandı, kodlanmadı.
