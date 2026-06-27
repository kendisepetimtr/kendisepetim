import { parseNotificationSettings, type TenantNotificationSettings } from "@/lib/notification-settings";
import { createServiceSupabaseClient } from "@/lib/supabase/admin";
import type { ActivityLogRow } from "@/lib/supabase/activity-log-types";

const POLL_MS = 2500;

export async function loadTenantNotificationSettings(
  tenantId: string,
): Promise<TenantNotificationSettings> {
  const svc = createServiceSupabaseClient();
  const { data } = await svc.from("tenants").select("notification_settings").eq("id", tenantId).maybeSingle();
  return parseNotificationSettings(data?.notification_settings);
}

export async function fetchActivityLogsSince(
  tenantId: string,
  sinceIso: string,
): Promise<ActivityLogRow[]> {
  const svc = createServiceSupabaseClient();
  const { data, error } = await svc
    .from("activity_logs")
    .select("*")
    .eq("tenant_id", tenantId)
    .gt("created_at", sinceIso)
    .order("created_at", { ascending: true })
    .limit(50);

  if (error || !data) return [];
  return data as ActivityLogRow[];
}

export function createActivityLogSseStream(
  tenantId: string,
  signal: AbortSignal,
  initialSettings?: TenantNotificationSettings,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let since = new Date().toISOString();
  let settings = initialSettings;

  return new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      try {
        if (!settings) {
          settings = await loadTenantNotificationSettings(tenantId);
        }
        send("settings", settings);
        send("ready", { ok: true });
      } catch {
        send("error", { message: "Ayarlar yüklenemedi." });
        controller.close();
        return;
      }

      const tick = async () => {
        if (signal.aborted) return;
        try {
          const logs = await fetchActivityLogsSince(tenantId, since);
          for (const log of logs) {
            since = log.created_at;
            send("activity", log);
          }
        } catch {
          send("error", { message: "Bağlantı kesildi." });
        }
      };

      const interval = setInterval(() => void tick(), POLL_MS);
      void tick();

      signal.addEventListener(
        "abort",
        () => {
          clearInterval(interval);
          try {
            controller.close();
          } catch {
            /* already closed */
          }
        },
        { once: true },
      );
    },
  });
}
