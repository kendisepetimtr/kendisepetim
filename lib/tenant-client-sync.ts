import type { TenantRow } from "@/lib/supabase/tenant-types";

/** RSC → client aktarımında devasa data URL'ler payload limitini aşmasın diye üst sınır. */
const MAX_CLIENT_SYNC_URL_LENGTH = 4096;

function stripHeavyUrl(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  const trimmed = url.trim();
  if (trimmed.length > MAX_CLIENT_SYNC_URL_LENGTH) return null;
  return trimmed;
}

/** Panel layout'unun client bileşenine gönderdiği tenant — logo/kapak blob'ları kırpılır. */
export function stripTenantRowForClientSync(row: TenantRow): TenantRow {
  return {
    ...row,
    logo_url: stripHeavyUrl(row.logo_url),
    cover_image_url: stripHeavyUrl(row.cover_image_url),
    owner_admin_pin_hash: null,
    owner_admin_pin_set_at: null,
  };
}
