# Süperadmin paneli — kayıtlı plan

Bu belge onaylanan kapsamı saklar; uygulama Supabase tenant katmanı hazır olduktan sonra yapılacaktır.

## URL ve erişim

- Panel yolu: `https://kendisepetim.com/superadmin`
- İlk aşama: tek paylaşımlı şifre ile giriş (env); sonra düzgün auth (ör. Supabase kullanıcı + MFA).

## İşlevler (v1 hedefi)

| Özellik | Açıklama |
|--------|-----------|
| İşletme listesi | Kayıtlı restoranları listeleme |
| Subdomain | Görüntüleme, düzenleme, çakışma kontrolü, rezerve kelimeler |
| QR menü | Ayrı bayrak: `public_menu_enabled` — kapatıldığında halka açık menü kapalı |
| Panel | Ayrı bayrak: `dashboard_enabled` — ödeme uyarısı akışında önce QR kapat, panel ayrı kontrol |
| Paket | `free` / `premium` (enum; genişletilebilir) |
| Sahip bilgisi | Ad, e-posta, telefon görüntüleme |

## Mimari notlar

- Merkezi kayıt: `public.tenants` (Supabase migration ile tanımlı).
- Süperadmin işlemleri: RLS’yi aşmak için sunucu tarafında `SUPABASE_SERVICE_ROLE_KEY` (asla `NEXT_PUBLIC` yapılmaz).
- İşletme sahibi: ileride `owner_user_id → auth.users`; şimdilik kolon nullable, kayıt akışı bağlanınca doldurulur.

## Supabase migration

1. Supabase Dashboard → **SQL Editor** → `supabase/migrations/` altındaki dosyanın içeriğini çalıştırın  
   veya CLI: `supabase db push` (projede CLI yapılandırılmışsa).

2. `.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (veya publishable), geliştirme için `SUPABASE_SERVICE_ROLE_KEY`.

Kayıt formunun `localStorage` yerine/yanına Supabase yazması ayrı adımdır; şema önce hazırdır.

## Uygulama (v1)

- Giriş: `/superadmin/giris` — `SUPERADMIN_PASSWORD` + `SUPERADMIN_SESSION_SECRET` (`.env.example`).
- Panel: `/superadmin` — `tenants` listesi, subdomain düzenleme, plan, `public_menu_enabled` / `dashboard_enabled` anahtarları.
- Bayrakların QR menü ve işletme panelinde **zorunlu kılınması** (okuma / engelleme) ayrı entegrasyon adımıdır; şu an veritabanı güncellenir.
