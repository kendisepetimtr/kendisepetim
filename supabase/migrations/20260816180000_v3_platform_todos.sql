/*
  v3 hedef sürüm + Yemeksepeti/partner yol haritası yapılacakları.
  Tekrar çalıştırılabilir: mevcut başlıklar atlanır.
*/

insert into public.platform_versions (major, minor, patch, is_current, is_target, released_at)
select 3, 0, 0, false, false, null
where not exists (
  select 1 from public.platform_versions where major = 3 and minor = 0 and patch = 0
);

update public.platform_versions
set is_target = false, updated_at = now()
where is_target = true
  and not (major = 3 and minor = 0 and patch = 0);

update public.platform_versions
set is_target = true, updated_at = now()
where major = 3 and minor = 0 and patch = 0;

with v as (
  select id from public.platform_versions
  where major = 3 and minor = 0 and patch = 0
  limit 1
),
items (title, description) as (
  values
  (
    '[Partner] Host ve yönlendirme',
    'partner.kendisepetim.com (dev: partner.localhost) reserved subdomain. Menu slug gibi rewrite edilmesin. Restoran kayıt/giriş yalnızca partner’da. www /kayit ve /giris partner’a yönlensin. Vercel’e partner domain eklenir.'
  ),
  (
    '[Partner] Başvuru formu (adım 1)',
    'Progress bar’lı form: tabela adı, sahip adı/soyadı, iş tipi kilit Restoran, şube kilit 1, e-posta, cep +90, iş telefonu, teslimat (işletme kurye + gel al aktif; platform kurye pasif/yakında), cihaz-internet evet/hayır, aydınlatma checkbox (link şimdilik boş), şifre+tekrar (1 büyük, 1 rakam, 1 özel). CTA eksik alanda scroll. Alt: giriş yap + kurye olmak ister misin (boş link).'
  ),
  (
    '[Partner] Beklemede hesap ve teşekkür ekranı',
    'Kayıt sonrası canlı menü/dashboard açılmaz. public_menu, dashboard, marketplace kapalı. Ekran: talebiniz alındı. Kullanıcı giriş yapabilir; panelde beklemede durumu.'
  ),
  (
    '[Partner] Superadmin başvuru kuyruğu',
    'Onay/red, iletişim notu, slug kilitleme. Onayda QR menü + panel açılır. Redde gerekçe. Slug’ı başvuru anında müşteriye bırakmamak önerilir.'
  ),
  (
    '[Partner] Şifre sıfırlama (düz metin yok)',
    'Superadmin restoran şifresini okuyamaz. Sıfırla: tek kullanımlık geçici şifre veya e-posta reset + işlem logu. Düz metin kolon yok.'
  ),
  (
    '[Pazaryeri] www müşteri ana sayfa',
    'Ana sayfa tamamen dış kullanıcı. Gate kartları kalkar. Konum/bölge, restoran kartları, mutfak filtresi, arama. Restoran CTA partner’a gider.'
  ),
  (
    '[Pazaryeri] Sepet ve sipariş (işletme kurye + gel al)',
    'Keşfet → menü → sepet → adres → teslimat tipi. İlk sürüm tek restoran/sepet. Kapıda ödeme önce.'
  ),
  (
    '[Restoran] Sipariş mutfağı',
    'Yeni sipariş, kabul/red, hazırlanıyor, kurye çıktı, teslim. Tablet/telefon. QR ve dış sipariş aynı kuyruk.'
  ),
  (
    '[QR] slug = menü + sipariş',
    'slug.kendisepetim.com ücretsiz QR menü ve dış sipariş. Onaysız restoran slug’da görünmez.'
  ),
  (
    '[Hukuk] Aydınlatma ve mağaza metinleri',
    'Aydınlatma metni, üyelik, hesap silme, iade. Partner checkbox linki doldurulur. Play/App Store şartı.'
  ),
  (
    '[Ödeme] Online tahsilat',
    'iyzico/PayTR. Kapıda nakit/POS ilk aşamada kalır.'
  ),
  (
    '[Uygulama] Capacitor Android APK',
    'WebView www. Siteden APK indir. Keystore yedek. iOS IPA siteden dağıtılmaz.'
  ),
  (
    '[Uygulama] Google Play',
    '25 USD hesap, gizlilik, ekran görüntüleri, AAB, imza.'
  ),
  (
    '[Uygulama] App Store',
    '99 USD/yıl, Mac/Xcode, TestFlight, şirket ise D-U-N-S.'
  ),
  (
    '[Uygulama] Windows (opsiyonel PWA)',
    'Capacitor resmi masaüstü değil. İlk yol PWA. .exe için Tauri/Electron sonra.'
  ),
  (
    '[Kurye] Platform kurye operasyonu',
    'Başvuru linki, vardiya, bölge, ücret, sigorta, canlı harita. Partner formundaki kurye seçeneği o zaman açılır.'
  )
)
insert into public.platform_todos (title, description, version_id, status)
select items.title, items.description, v.id, 'open'
from items
cross join v
where not exists (
  select 1 from public.platform_todos t
  where t.version_id = v.id and t.title = items.title
);
