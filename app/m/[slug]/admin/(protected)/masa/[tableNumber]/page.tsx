import { notFound, redirect } from "next/navigation";
import KasaTableHubClient from "@/components/kasa/kasa-table-hub-client";
import { requireOwnerTenantSlugMatch } from "@/lib/admin/tenant-slug-guard";
import { loadVisibleMenuForTenant } from "@/lib/kasa/menu-load";
import { loadKasaSessionDetail } from "@/lib/kasa/sessions-service";
import { ADMIN_OPS_SURFACE, opsSiparislerPath } from "@/lib/ops/surface";
import { tenantPaymentFlagsFromRow } from "@/lib/tenant-payment";

type Props = { params: Promise<{ slug: string; tableNumber: string }> };

function parseTableNumber(raw: string): number | null {
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1 || n > 200) return null;
  return n;
}

export default async function AdminTableSessionPage({ params }: Props) {
  const { slug, tableNumber: rawTable } = await params;
  const tableNumber = parseTableNumber(rawTable);
  if (tableNumber == null) notFound();

  const tenant = await requireOwnerTenantSlugMatch(slug);
  if (tableNumber > (tenant.table_count ?? 0)) notFound();

  const detail = await loadKasaSessionDetail(tenant.id, tableNumber);
  if (!detail.ok) {
    redirect(opsSiparislerPath(ADMIN_OPS_SURFACE));
  }

  const menu = await loadVisibleMenuForTenant(tenant.id);

  return (
    <KasaTableHubClient
      tableNumber={tableNumber}
      businessName={tenant.business_name}
      subdomain={tenant.subdomain}
      initialSession={detail.session}
      paymentFlags={tenantPaymentFlagsFromRow(tenant)}
      menu={menu}
      surface={ADMIN_OPS_SURFACE}
    />
  );
}
