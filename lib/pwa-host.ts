import { parseMenuSubdomainFromHost } from "@/lib/menu-subdomain";
import { isPartnerHost } from "@/lib/partner/host";

export function hostnameWithoutPort(hostHeader: string | null | undefined): string {
  return (hostHeader ?? "").split(":")[0]?.toLowerCase() ?? "";
}

/** www / apex / düz localhost — müşteri keşif PWA */
export function isMarketplacePwaHost(hostHeader: string | null | undefined): boolean {
  if (isPartnerHost(hostHeader)) return false;
  if (parseMenuSubdomainFromHost(hostHeader)) return false;
  const host = hostnameWithoutPort(hostHeader);
  return (
    host === "kendisepetim.com" ||
    host === "www.kendisepetim.com" ||
    host === "localhost" ||
    host === "127.0.0.1"
  );
}

/** slug.kendisepetim.com / slug.localhost — restoran menü PWA */
export function isRestaurantMenuPwaHost(hostHeader: string | null | undefined): boolean {
  return parseMenuSubdomainFromHost(hostHeader) != null;
}
