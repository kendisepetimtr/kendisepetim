import SuperadminCustomersClient from "@/components/superadmin/superadmin-customers-client";
import { requireSuperadminOrRedirect } from "@/lib/superadmin/guard";
import { listSuperadminCustomers } from "@/lib/superadmin/customers-service";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Müşteriler",
};

export default async function SuperadminCustomersPage() {
  await requireSuperadminOrRedirect();
  const result = await listSuperadminCustomers();

  return (
    <SuperadminCustomersClient
      initialCustomers={result.ok ? result.customers : []}
      loadError={result.ok ? null : result.error}
    />
  );
}
