import type { User } from "@supabase/supabase-js";
import { getOwnerTenantByUserId } from "@/lib/owner-tenant";
import { getCustomerProfileByUserId } from "@/lib/musteri/customer-profile";

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

export const RESTAURANT_ACCOUNT_ON_CUSTOMER_LOGIN =
  "Bu bir restoran hesabı. Yemek siparişi için ayrı bir müşteri hesabı oluşturun — aynı e-posta kullanılamaz.";

export const CUSTOMER_ACCOUNT_ON_RESTAURANT_LOGIN =
  "Bu bir müşteri hesabı. Restoran paneline bu hesapla girilemez. Restoran için ayrı e-posta ile kayıt olun.";

export const CUSTOMER_SESSION_BLOCKS_RESTAURANT_REGISTER =
  "Açık oturum bir müşteri hesabı. Restoran kaydı için önce çıkış yapın ve ayrı bir e-posta kullanın.";

export const RESTAURANT_SESSION_BLOCKS_CUSTOMER_REGISTER =
  "Açık oturum bir restoran hesabı. Müşteri kaydı için önce çıkış yapın ve ayrı bir e-posta kullanın.";
