/** Aynı tarayıcıda kasa / panel sekmelerinin açık olup olmadığını izler. */

export type OpsClientRole = "kasa" | "panel";

const HEARTBEAT_MS = 2000;
const STALE_MS = 6000;
const STORAGE_PREFIX = "kendisepetim:ops-presence:v1:";

type PresenceBuckets = Partial<Record<OpsClientRole, Record<string, number>>>;

export function peerOpsClientRole(self: OpsClientRole): OpsClientRole {
  return self === "kasa" ? "panel" : "kasa";
}

/** QR / marketplace gel-al + paket — kasa açıkken panele bildirim düşmez. */
function isRemotePickupOrDeliveryOrder(log: {
  action: string;
  actor_type: string;
  metadata?: Record<string, unknown> | null;
}): boolean {
  if (log.action !== "order_created") return false;
  const source = typeof log.metadata?.source === "string" ? log.metadata.source : "";
  const fulfillment =
    typeof log.metadata?.fulfillment_type === "string" ? log.metadata.fulfillment_type : "";
  if (fulfillment !== "pickup" && fulfillment !== "delivery") return false;

  const fromCustomerChannel =
    log.actor_type === "customer" ||
    source === "qr_menu" ||
    source === "marketplace";
  return fromCustomerChannel;
}

export function shouldSuppressCrossClientOrderAlert(
  log: {
    action: string;
    actor_type: string;
    metadata?: Record<string, unknown> | null;
  },
  self: OpsClientRole,
  peerOpen: boolean,
): boolean {
  if (!peerOpen) return false;
  if (log.action !== "order_created") return false;

  const source = typeof log.metadata?.source === "string" ? log.metadata.source : "";
  const fromCashier = log.actor_type === "cashier" || source === "cashier";
  const fromPanel =
    log.actor_type === "owner" ||
    source === "panel" ||
    source === "owner" ||
    source === "panel_manual";

  // Gel-al / paket (QR): kasa sekmesi açıksa yalnızca kasa uyarır; panel sessiz kalır.
  if (self === "panel" && isRemotePickupOrDeliveryOrder(log)) return true;

  if (self === "panel") return fromCashier;
  if (self === "kasa") return fromPanel;
  return false;
}

export function opsPresenceStorageKey(scope: string): string {
  return STORAGE_PREFIX + scope;
}

export function opsPresenceChannelName(scope: string): string {
  return STORAGE_PREFIX + scope;
}

function readBuckets(scope: string): PresenceBuckets {
  try {
    const raw = localStorage.getItem(opsPresenceStorageKey(scope));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as PresenceBuckets;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeBuckets(scope: string, buckets: PresenceBuckets): void {
  try {
    localStorage.setItem(opsPresenceStorageKey(scope), JSON.stringify(buckets));
  } catch {
    /* ignore quota / private mode */
  }
}

function pruneBucket(bucket: Record<string, number> | undefined, now: number): Record<string, number> {
  if (!bucket) return {};
  const next: Record<string, number> = {};
  for (const [tabId, at] of Object.entries(bucket)) {
    if (now - at < STALE_MS) next[tabId] = at;
  }
  return next;
}

function anyFresh(bucket: Record<string, number> | undefined, now = Date.now()): boolean {
  if (!bucket) return false;
  return Object.values(bucket).some((at) => now - at < STALE_MS);
}

export function isOpsClientPeerOpen(scope: string, self: OpsClientRole): boolean {
  if (typeof window === "undefined" || !scope) return false;
  return anyFresh(readBuckets(scope)[peerOpsClientRole(self)]);
}

export type OpsPresenceController = {
  tabId: string;
  announce: () => void;
  clearSelf: () => void;
  isPeerOpen: () => boolean;
};

/** Sekme başına presence controller; React hook dışında da kullanılabilir. */
export function createOpsPresenceController(
  role: OpsClientRole,
  scope: string,
): OpsPresenceController {
  const tabId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `tab-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  const peer = peerOpsClientRole(role);

  const announce = () => {
    const now = Date.now();
    const current = readBuckets(scope);
    const next: PresenceBuckets = {
      kasa: pruneBucket(current.kasa, now),
      panel: pruneBucket(current.panel, now),
    };
    next[role] = { ...(next[role] ?? {}), [tabId]: now };
    writeBuckets(scope, next);
  };

  const clearSelf = () => {
    const now = Date.now();
    const current = readBuckets(scope);
    const own = { ...(current[role] ?? {}) };
    delete own[tabId];
    writeBuckets(scope, {
      kasa: role === "kasa" ? pruneBucket(own, now) : pruneBucket(current.kasa, now),
      panel: role === "panel" ? pruneBucket(own, now) : pruneBucket(current.panel, now),
    });
  };

  const isPeerOpen = () => anyFresh(readBuckets(scope)[peer]);

  return { tabId, announce, clearSelf, isPeerOpen };
}

export const OPS_PRESENCE_HEARTBEAT_MS = HEARTBEAT_MS;
