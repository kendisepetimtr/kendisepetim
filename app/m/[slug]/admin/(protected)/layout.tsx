import type { ReactNode } from "react";
import { requireOwnerAdminOrRedirect } from "@/lib/owner-admin/guard";
import { requireOwnerTenantSlugMatch } from "@/lib/admin/tenant-slug-guard";
import { redirectUnapprovedTenantPanel } from "@/lib/partner/require-approved-panel";

export const dynamic = "force-dynamic";

type LayoutProps = {
  children: ReactNode;
  params: Promise<{ slug: string }>;
};

export default async function ProtectedTenantAdminLayout({ children, params }: LayoutProps) {
  const { slug } = await params;
  await redirectUnapprovedTenantPanel(slug);
  await requireOwnerTenantSlugMatch(slug);
  await requireOwnerAdminOrRedirect("/admin");
  return <>{children}</>;
}
