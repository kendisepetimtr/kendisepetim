import type { User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { AUTH_INTENT_COOKIE, parseAuthIntent } from "@/lib/auth-intent";
import { getOwnerTenantByUserId } from "@/lib/owner-tenant";
import { getCustomerProfileByUserId, upsertCustomerProfile } from "@/lib/musteri/customer-profile";
import { tryCreateServerSupabaseClient } from "@/lib/supabase/server";

export type AccountKind = "restaurant" | "customer" | "unknown";

function metaKind(user: User): AccountKind | null {
  const raw = user.user_metadata?.account_kind;
  if (raw === "restaurant" || raw === "customer") return raw;
  return null;
}

/**
 * Tek hesap = tek rol. Tenant varsa her zaman restoran.
 * Müşteri, yalnızca tenant yokken profil / metadata ile tanınır.
 */
export async function resolveAccountKind(user: User): Promise<AccountKind> {
  const tenant = await getOwnerTenantByUserId(user.id);
  if (tenant) return "restaurant";

  const meta = metaKind(user);
  if (meta === "customer") return "customer";
  if (meta === "restaurant") return "restaurant";

  const profile = await getCustomerProfileByUserId(user.id);
  if (profile) return "customer";

  return "unknown";
}

/**
 * Oturum açık, tenant yok, tür belirsiz → müşteri profili oluştur.
 * Login loop'unu (signed-in ama kind≠customer) kırar.
 * Restoran kayıt intent'i varken müşteriye dönüştürmez.
 */
export async function ensureCustomerAccount(user: User): Promise<AccountKind> {
  const kind = await resolveAccountKind(user);
  if (kind === "restaurant" || kind === "customer") return kind;

  try {
    const jar = await cookies();
    if (parseAuthIntent(jar.get(AUTH_INTENT_COOKIE)?.value) === "restaurant") {
      return "unknown";
    }
  } catch {
    /* cookies() dış bağlam */
  }

  const meta = user.user_metadata ?? {};
  const fullName =
    typeof meta.full_name === "string"
      ? meta.full_name
      : typeof meta.name === "string"
        ? meta.name
        : "";
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const firstName =
    (typeof meta.first_name === "string" && meta.first_name.trim()) || parts[0] || "Müşteri";
  const lastName =
    (typeof meta.last_name === "string" && meta.last_name.trim()) || parts.slice(1).join(" ") || "";

  await upsertCustomerProfile({
    userId: user.id,
    firstName,
    lastName,
    phone: typeof meta.phone === "string" ? meta.phone : "",
    email: user.email ?? "",
  });

  try {
    const supabase = await tryCreateServerSupabaseClient();
    if (supabase) {
      await supabase.auth.updateUser({
        data: { account_kind: "customer", first_name: firstName, last_name: lastName },
      });
    }
  } catch {
    /* metadata güncellenemese de profil varsa müşteri sayılır */
  }

  const again = await resolveAccountKind(user);
  if (again === "customer") return "customer";

  // Profil tablosu yoksa bile metadata yazıldıysa sonraki isteklerde customer olur;
  // bu istekte metadata güncel user objesinde olmayabilir → müşteri kabul et.
  return "customer";
}

export const RESTAURANT_ACCOUNT_ON_CUSTOMER_LOGIN =
  "Bu bir restoran hesabı. Yemek siparişi için ayrı bir müşteri hesabı oluşturun — aynı e-posta kullanılamaz.";

export const CUSTOMER_ACCOUNT_ON_RESTAURANT_LOGIN =
  "Bu bir müşteri hesabı. Restoran paneline bu hesapla girilemez. Restoran için ayrı e-posta ile kayıt olun.";

export const CUSTOMER_SESSION_BLOCKS_RESTAURANT_REGISTER =
  "Açık oturum bir müşteri hesabı. Restoran kaydı için önce çıkış yapın ve ayrı bir e-posta kullanın.";

export const RESTAURANT_SESSION_BLOCKS_CUSTOMER_REGISTER =
  "Açık oturum bir restoran hesabı. Müşteri kaydı için önce çıkış yapın ve ayrı bir e-posta kullanın.";
