"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "../../../../lib/supabase";

type OrdersRealtimeListenerProps = {
  restaurantId: string;
};

export function OrdersRealtimeListener({ restaurantId }: OrdersRealtimeListenerProps) {
  const router = useRouter();
  const isRefreshingRef = useRef(false);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    const channel = supabase
      .channel(`dashboard-orders-${restaurantId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "orders",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        () => {
          if (isRefreshingRef.current) return;
          isRefreshingRef.current = true;
          router.refresh();

          // Avoid refresh storms if multiple events arrive together.
          window.setTimeout(() => {
            isRefreshingRef.current = false;
          }, 600);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [restaurantId, router]);

  return null;
}
