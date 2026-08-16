/**
 * Superadmin v3 yapılacaklarını platform_todos'a yazar.
 * Çalıştır: node --env-file=.env.local scripts/seed-v3-platform-todos.mjs
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekli.");
  process.exit(1);
}

const svc = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const TODOS = [
  {
    title: "[Partner] Host ve yönlendirme",
    description:
      "partner.kendisepetim.com (dev: partner.localhost) reserved subdomain. Menu slug gibi rewrite edilmesin. Restoran kayıt/giriş yalnızca partner’da. www /kayit ve /giris partner’a yönlensin. Vercel’e partner domain eklenir.",
  },
  {
    title: "[Partner] Başvuru formu (adım 1)",
    description:
      "Progress bar’lı form: tabela adı, sahip adı/soyadı, iş tipi kilit Restoran, şube kilit 1, e-posta, cep +90, iş telefonu, teslimat (işletme kurye + gel al aktif; platform kurye pasif/yakında), cihaz-internet evet/hayır, aydınlatma checkbox (link şimdilik boş), şifre+tekrar (1 büyük, 1 rakam, 1 özel). CTA eksik alanda scroll. Alt: giriş yap + kurye olmak ister misin (boş link).",
  },
  {
    title: "[Partner] Beklemede hesap ve teşekkür ekranı",
    description:
      "Kayıt sonrası canlı menü/dashboard açılmaz. public_menu, dashboard, marketplace kapalı. Ekran: talebiniz alındı. Kullanıcı giriş yapabilir; panelde beklemede durumu.",
  },
  {
    title: "[Partner] Superadmin başvuru kuyruğu",
    description:
      "Onay/red, iletişim notu, slug kilitleme. Onayda QR menü + panel açılır. Redde gerekçe. Slug’ı başvuru anında müşteriye bırakmamak önerilir.",
  },
  {
    title: "[Partner] Şifre sıfırlama (düz metin yok)",
    description:
      "Superadmin restoran şifresini okuyamaz. Sıfırla: tek kullanımlık geçici şifre veya e-posta reset + işlem logu. Düz metin kolon yok.",
  },
  {
    title: "[Pazaryeri] www müşteri ana sayfa",
    description:
      "Ana sayfa tamamen dış kullanıcı. Gate kartları kalkar. Konum/bölge, restoran kartları, mutfak filtresi, arama. Restoran CTA partner’a gider.",
  },
  {
    title: "[Pazaryeri] Sepet ve sipariş (işletme kurye + gel al)",
    description:
      "Keşfet → menü → sepet → adres → teslimat tipi. İlk sürüm tek restoran/sepet. Kapıda ödeme önce.",
  },
  {
    title: "[Restoran] Sipariş mutfağı",
    description:
      "Yeni sipariş, kabul/red, hazırlanıyor, kurye çıktı, teslim. Tablet/telefon. QR ve dış sipariş aynı kuyruk.",
  },
  {
    title: "[QR] slug = menü + sipariş",
    description:
      "slug.kendisepetim.com ücretsiz QR menü ve dış sipariş. Onaysız restoran slug’da görünmez.",
  },
  {
    title: "[Hukuk] Aydınlatma ve mağaza metinleri",
    description:
      "Aydınlatma metni, üyelik, hesap silme, iade. Partner checkbox linki doldurulur. Play/App Store şartı.",
  },
  {
    title: "[Ödeme] Online tahsilat",
    description: "iyzico/PayTR. Kapıda nakit/POS ilk aşamada kalır.",
  },
  {
    title: "[Uygulama] Capacitor Android APK",
    description:
      "WebView www. Siteden APK indir. Keystore yedek. iOS IPA siteden dağıtılmaz.",
  },
  {
    title: "[Uygulama] Google Play",
    description: "25 USD hesap, gizlilik, ekran görüntüleri, AAB, imza.",
  },
  {
    title: "[Uygulama] App Store",
    description: "99 USD/yıl, Mac/Xcode, TestFlight, şirket ise D-U-N-S.",
  },
  {
    title: "[Uygulama] Windows (opsiyonel PWA)",
    description:
      "Capacitor resmi masaüstü değil. İlk yol PWA. .exe için Tauri/Electron sonra.",
  },
  {
    title: "[Kurye] Platform kurye operasyonu",
    description:
      "Başvuru linki, vardiya, bölge, ücret, sigorta, canlı harita. Partner formundaki kurye seçeneği o zaman açılır.",
  },
];

async function ensureV3() {
  const { data: existing, error } = await svc
    .from("platform_versions")
    .select("*")
    .eq("major", 3)
    .eq("minor", 0)
    .eq("patch", 0)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (existing) return existing.id;

  await svc.from("platform_versions").update({ is_target: false }).eq("is_target", true);

  const { data, error: insErr } = await svc
    .from("platform_versions")
    .insert({
      major: 3,
      minor: 0,
      patch: 0,
      is_current: false,
      is_target: true,
      released_at: null,
    })
    .select("id")
    .single();
  if (insErr || !data) throw new Error(insErr?.message ?? "3.0.0 oluşturulamadı.");
  return data.id;
}

const versionId = await ensureV3();

const { data: currentTodos, error: listErr } = await svc
  .from("platform_todos")
  .select("id, title")
  .eq("version_id", versionId);
if (listErr) throw new Error(listErr.message);

const have = new Set((currentTodos ?? []).map((t) => t.title));
let inserted = 0;
let skipped = 0;

for (const todo of TODOS) {
  if (have.has(todo.title)) {
    skipped += 1;
    continue;
  }
  const { error } = await svc.from("platform_todos").insert({
    title: todo.title,
    description: todo.description,
    version_id: versionId,
    status: "open",
  });
  if (error) throw new Error(`${todo.title}: ${error.message}`);
  inserted += 1;
}

console.log(JSON.stringify({ versionId, inserted, skipped, total: TODOS.length }));
