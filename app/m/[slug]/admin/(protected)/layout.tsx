import type { ReactNode } from "react";
import { requireOwnerAdminOrRedirect } from "@/lib/owner-admin/guard";
import { requireOwnerTenantSlugMatch } from "@/lib/admin/tenant-slug-guard";

export const dynamic = "force-dynamic";

type LayoutProps = {
  children: ReactNode;
  params: Promise<{ slug: string }>;
};

export default async function ProtectedTenantAdminLayout({ children, params }: LayoutProps) {
  const { slug } = await params;
  await requireOwnerTenantSlugMatch(slug);
  await requireOwnerAdminOrRedirect("/admin");
  return <>{children}</>;
}
