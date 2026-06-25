import type { LocalTenantProfile } from "@/lib/local-tenant";

/** RSC / server action yanıtında taşınabilecek maksimum URL uzunluğu. */
const MAX_CLIENT_SYNC_URL_LENGTH = 2048;

function stripHeavyMediaUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (trimmed.length > MAX_CLIENT_SYNC_URL_LENGTH) return "";
  if (trimmed.startsWith("data:") && trimmed.length > 512) return "";
  return trimmed;
}

/** Server → client profil yanıtında logo/kapak blob'larını kırpar. */
export function slimTenantProfileForClient(profile: LocalTenantProfile): LocalTenantProfile {
  return {
    ...profile,
    logoDataUrl: stripHeavyMediaUrl(profile.logoDataUrl),
    coverImageUrl: stripHeavyMediaUrl(profile.coverImageUrl),
  };
}

/** Sunucu profili + localStorage (logo/kapak) birleşimi. */
export function mergeDashboardTenantProfiles(
  local: LocalTenantProfile | null,
  server: LocalTenantProfile,
): LocalTenantProfile {
  if (!local || local.subdomain !== server.subdomain) {
    return server;
  }
  return {
    ...server,
    logoDataUrl: server.logoDataUrl || local.logoDataUrl,
    coverImageUrl: server.coverImageUrl || local.coverImageUrl,
  };
}
