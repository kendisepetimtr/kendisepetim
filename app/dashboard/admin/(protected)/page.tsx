import OwnerAdminPanel from "@/components/dashboard/owner-admin-panel";
import { buildAdminOrders } from "@/lib/order-map";
import { getCurrentOwnerTenant } from "@/lib/owner-admin/guard";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { OrderLineRow, OrderRow } from "@/lib/supabase/order-types";
import { redirect } from "next/navigation";

export default async function OwnerAdminDashboardPage() {
  const tenant = await getCurrentOwnerTenant();
  if (!tenant) {
    redirect("/dashboard");
  }

  const supabase = await createServerSupabaseClient();
  const [{ data: orderRows }, { data: lineRows }] = await Promise.all([
    supabase
      .from("orders")
      .select("*")
      .eq("tenant_id", tenant.id)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("order_lines")
      .select("*")
      .eq("tenant_id", tenant.id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
  ]);

  const orders = buildAdminOrders(
    ((orderRows ?? []) as OrderRow[]).slice().sort((a, b) => b.created_at.localeCompare(a.created_at)),
    (lineRows ?? []) as OrderLineRow[],
  );

  return (
    <OwnerAdminPanel
      businessName={tenant.business_name}
      subdomain={tenant.subdomain}
      logoUrl={tenant.logo_url}
      ownerName={tenant.owner_name}
      hoursDayMode={tenant.hours_day_mode}
      openTime={tenant.open_time}
      closeTime={tenant.close_time}
      initialOrders={orders}
    />
  );
}
