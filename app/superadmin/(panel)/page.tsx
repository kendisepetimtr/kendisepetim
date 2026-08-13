import SuperadminOverview from "@/components/superadmin/superadmin-overview";
import { requireSuperadminOrRedirect } from "@/lib/superadmin/guard";
import {
  buildAccountingMonthSummary,
  loadAllAccountingEntries,
} from "@/lib/superadmin/accounting-service";
import { currentYearMonth } from "@/lib/superadmin/accounting-types";
import { SUPERADMIN_TENANT_SELECT } from "@/lib/superadmin/tenant-select";
import { createServiceSupabaseClient } from "@/lib/supabase/admin";
import { normalizeTenantPlan } from "@/lib/tenant-entitlements";
import { countCustomerProfiles } from "@/lib/superadmin/customers-service";
import type { TenantRow } from "@/lib/supabase/tenant-types";

export default async function SuperadminOverviewPage() {
  await requireSuperadminOrRedirect();

  let tenants: TenantRow[] = [];
  let loadError: string | null = null;

  try {
    const svc = createServiceSupabaseClient();
    const { data, error } = await svc
      .from("tenants")
      .select(SUPERADMIN_TENANT_SELECT)
      .order("created_at", { ascending: false });
    if (error) loadError = error.message;
    else {
      tenants = ((data ?? []) as Array<Omit<TenantRow, "owner_admin_pin_hash">>).map((row) => ({
        ...row,
        owner_admin_pin_hash: null,
        marketplace_enabled: row.marketplace_enabled === true,
        plan: normalizeTenantPlan(row.plan),
        trial_ends_at: row.trial_ends_at ?? null,
      })) as TenantRow[];
    }
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Bağlantı hatası.";
  }

  const { year, month } = currentYearMonth();
  const [accounting, customerCount] = await Promise.all([
    loadAllAccountingEntries(),
    countCustomerProfiles(),
  ]);
  const accountingSummary = accounting.ok
    ? buildAccountingMonthSummary(accounting.entries, year, month)
    : null;

  return (
    <SuperadminOverview
      tenants={tenants}
      accountingSummary={accountingSummary}
      accountingError={accounting.ok ? null : accounting.error}
      customerCount={customerCount}
    />
  );
}
