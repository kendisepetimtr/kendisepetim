"use client";

import {
  createOpsPresenceController,
  opsPresenceChannelName,
  opsPresenceStorageKey,
  OPS_PRESENCE_HEARTBEAT_MS,
  type OpsClientRole,
} from "@/lib/ops-client-presence";
import { useEffect, useState } from "react";

/**
 * Bu sekmenin kasa/panel rolünü yayınlar ve karşı rolün açık olup olmadığını izler.
 * Aynı tarayıcıdaki sekmeler localStorage + BroadcastChannel ile haberleşir.
 */
export function useOpsClientPresence(
  role: OpsClientRole,
  scope: string | null | undefined,
  enabled = true,
) {
  const [peerOpen, setPeerOpen] = useState(false);

  useEffect(() => {
    if (!enabled || !scope || typeof window === "undefined") {
      setPeerOpen(false);
      return;
    }

    const controller = createOpsPresenceController(role, scope);
    let channel: BroadcastChannel | null = null;
    let stopped = false;

    const syncPeer = () => {
      if (stopped) return;
      setPeerOpen(controller.isPeerOpen());
    };

    const beat = () => {
      controller.announce();
      try {
        channel?.postMessage({ type: "heartbeat", role, tabId: controller.tabId });
      } catch {
        /* ignore */
      }
      syncPeer();
    };

    try {
      channel = new BroadcastChannel(opsPresenceChannelName(scope));
      channel.onmessage = () => syncPeer();
    } catch {
      channel = null;
    }

    const onStorage = (event: StorageEvent) => {
      if (event.key === opsPresenceStorageKey(scope)) syncPeer();
    };

    const onPageHide = () => {
      controller.clearSelf();
      try {
        channel?.postMessage({ type: "bye", role, tabId: controller.tabId });
      } catch {
        /* ignore */
      }
    };

    beat();
    const heartbeatId = window.setInterval(beat, OPS_PRESENCE_HEARTBEAT_MS);
    window.addEventListener("storage", onStorage);
    window.addEventListener("pagehide", onPageHide);

    return () => {
      stopped = true;
      window.clearInterval(heartbeatId);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("pagehide", onPageHide);
      onPageHide();
      channel?.close();
    };
  }, [role, scope, enabled]);

  return { peerOpen };
}
