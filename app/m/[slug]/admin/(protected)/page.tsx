import OwnerAdminPanel from "@/components/dashboard/owner-admin-panel";
import { requireOwnerTenantSlugMatch } from "@/lib/admin/tenant-slug-guard";
import { loadActivityLogs } from "@/lib/dashboard/activity-logs-service";
import { buildAdminOrders } from "@/lib/order-map";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { OrderLineRow, OrderRow } from "@/lib/supabase/order-types";

export default async function TenantAdminDashboardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tenant = await requireOwnerTenantSlugMatch(slug);

  const supabase = await createServerSupabaseClient();
  const [{ data: orderRows }, { data: lineRows }, logsResult] = await Promise.all([
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
    loadActivityLogs(200),
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
      initialLogs={logsResult.ok ? logsResult.logs : []}
    />
  );
}
