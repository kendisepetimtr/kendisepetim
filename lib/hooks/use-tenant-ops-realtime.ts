"use client";

import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import {
  TENANT_OPS_BROADCAST_EVENT,
  tenantOpsChannelName,
  type TenantOpsRealtimePayload,
} from "@/lib/tenant-realtime";
import { useEffect, useRef } from "react";

type UseTenantOpsRealtimeOptions = {
  tenantId: string | null | undefined;
  onEvent: (payload: TenantOpsRealtimePayload) => void;
  /** Yalnızca bu action'larda onEvent (boş = hepsi) */
  actions?: string[];
};

/** Supabase Realtime broadcast — kasa/garson listelerini poll'suz yeniler. */
export function useTenantOpsRealtime({ tenantId, onEvent, actions }: UseTenantOpsRealtimeOptions) {
  const onEventRef = useRef(onEvent);
  const actionsRef = useRef(actions);
  onEventRef.current = onEvent;
  actionsRef.current = actions;

  useEffect(() => {
    if (!tenantId) return;

    let cancelled = false;
    let supabase: ReturnType<typeof createBrowserSupabaseClient> | null = null;

    try {
      supabase = createBrowserSupabaseClient();
    } catch (err) {
      console.error("[realtime] browser client:", err);
      return;
    }

    const channel = supabase
      .channel(tenantOpsChannelName(tenantId))
      .on("broadcast", { event: TENANT_OPS_BROADCAST_EVENT }, ({ payload }) => {
        if (cancelled) return;
        const p = (payload ?? {}) as TenantOpsRealtimePayload;
        const allow = actionsRef.current;
        if (allow && allow.length > 0 && !allow.includes(p.action)) return;
        onEventRef.current(p);
      })
      .subscribe();

    return () => {
      cancelled = true;
      if (supabase) void supabase.removeChannel(channel);
    };
  }, [tenantId]);
}
