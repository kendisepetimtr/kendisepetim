import type { ReactNode } from "react";
import { requireWaiterOrRedirect } from "@/lib/staff/guard";

export const dynamic = "force-dynamic";

type LayoutProps = {
  children: ReactNode;
  params: Promise<{ slug: string }>;
};

export default async function ProtectedGarsonLayout({ children, params }: LayoutProps) {
  const { slug } = await params;
  await requireWaiterOrRedirect(slug, "/garson");
  return <>{children}</>;
}
