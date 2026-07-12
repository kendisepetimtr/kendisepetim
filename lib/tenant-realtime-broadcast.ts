import { createServiceSupabaseClient } from "@/lib/supabase/admin";
import {
  TENANT_OPS_BROADCAST_EVENT,
  tenantOpsChannelName,
  type TenantOpsRealtimePayload,
} from "@/lib/tenant-realtime";

/** Sunucu — activity sonrası kasa/garson listelerini anında yeniletmek için. */
export async function broadcastTenantOpsEvent(
  tenantId: string,
  payload: TenantOpsRealtimePayload,
): Promise<void> {
  if (!tenantId) return;

  try {
    const svc = createServiceSupabaseClient();
    const channel = svc.channel(tenantOpsChannelName(tenantId), {
      config: { broadcast: { ack: false } },
    });

    await new Promise<void>((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        void svc.removeChannel(channel);
        resolve();
      };

      const timer = setTimeout(finish, 2500);

      channel.subscribe((status) => {
        if (status !== "SUBSCRIBED") return;
        void channel
          .send({
            type: "broadcast",
            event: TENANT_OPS_BROADCAST_EVENT,
            payload: {
              ...payload,
              at: payload.at ?? new Date().toISOString(),
            },
          })
          .finally(finish);
      });
    });
  } catch (err) {
    console.error("[realtime] broadcast failed:", err);
  }
}
