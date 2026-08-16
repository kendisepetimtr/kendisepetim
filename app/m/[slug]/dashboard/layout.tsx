import { redirectUnapprovedTenantPanel } from "@/lib/partner/require-approved-panel";

type Props = { children: React.ReactNode; params: Promise<{ slug: string }> };

export default async function TenantDashboardLayout({ children, params }: Props) {
  const { slug } = await params;
  await redirectUnapprovedTenantPanel(slug);
  return children;
}
