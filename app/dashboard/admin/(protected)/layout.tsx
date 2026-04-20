import type { ReactNode } from "react";
import { requireOwnerAdminOrRedirect } from "@/lib/owner-admin/guard";

export default async function ProtectedOwnerAdminLayout({ children }: { children: ReactNode }) {
  await requireOwnerAdminOrRedirect("/dashboard/admin");
  return <>{children}</>;
}
