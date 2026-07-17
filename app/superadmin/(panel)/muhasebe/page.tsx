import SuperadminAccountingClient from "@/components/superadmin/superadmin-accounting-client";
import { requireSuperadminOrRedirect } from "@/lib/superadmin/guard";
import { loadAllAccountingEntries } from "@/lib/superadmin/accounting-service";
import { currentYearMonth } from "@/lib/superadmin/accounting-types";

export default async function SuperadminAccountingPage() {
  await requireSuperadminOrRedirect();

  const { key } = currentYearMonth();
  const result = await loadAllAccountingEntries();

  return (
    <SuperadminAccountingClient
      initialEntries={result.ok ? result.entries : []}
      initialMonthKey={key}
      loadError={result.ok ? null : result.error}
    />
  );
}
