import type { ReactNode } from "react";
import { requireOwnerAdminOrRedirect } from "@/lib/owner-admin/guard";

export const dynamic = "force-dynamic";

export default async function ProtectedOwnerAdminLayout({ children }: { children: ReactNode }) {
  await requireOwnerAdminOrRedirect("/admin");
  return <>{children}</>;
}
