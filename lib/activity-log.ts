import { createServiceSupabaseClient } from "@/lib/supabase/admin";
import type { ActivityLogInsert } from "@/lib/supabase/activity-log-types";
import { broadcastTenantOpsEvent } from "@/lib/tenant-realtime-broadcast";

/**
 * Operasyon kaydi yazar. Hata durumunda sessizce basarisiz olur — ana islem bozulmaz.
 * Basarili yazimda Realtime broadcast yayinlar (kasa/garson yenileme).
 */
export async function writeActivityLog(input: ActivityLogInsert): Promise<string | null> {
  try {
    const svc = createServiceSupabaseClient();
    const { data, error } = await svc
      .from("activity_logs")
      .insert({
        tenant_id: input.tenant_id,
        actor_type: input.actor_type,
        actor_label: input.actor_label,
        action: input.action,
        entity_type: input.entity_type,
        entity_id: input.entity_id,
        order_code: input.order_code,
        metadata: input.metadata,
      })
      .select("id")
      .single();

    if (error) {
      console.error("[activity_log] insert failed:", error.message);
      return null;
    }

    void broadcastTenantOpsEvent(input.tenant_id, {
      action: input.action,
      entityType: input.entity_type,
      entityId: input.entity_id,
      orderCode: input.order_code,
    });

    return data?.id ?? null;
  } catch (err) {
    console.error("[activity_log] insert error:", err);
    return null;
  }
}
