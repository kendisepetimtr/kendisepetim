/**
 * Tenant operasyon Realtime — broadcast kanalı.
 * Staff PIN oturumları RLS SELECT yapamadığı için postgres_changes yerine broadcast kullanılır.
 * writeActivityLog sonrası sunucu yayınlar; kasa/garson istemcileri dinler.
 */

export type TenantOpsRealtimePayload = {
  action: string;
  entityType?: string;
  entityId?: string | null;
  orderCode?: string | null;
  at?: string;
};

export function tenantOpsChannelName(tenantId: string): string {
  return `tenant:${tenantId}:ops`;
}

export const TENANT_OPS_BROADCAST_EVENT = "ops";
