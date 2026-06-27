import type { ReactNode } from "react";
import { requireCashierOrRedirect } from "@/lib/staff/guard";

export const dynamic = "force-dynamic";

type LayoutProps = {
  children: ReactNode;
  params: Promise<{ slug: string }>;
};

export default async function ProtectedKasaLayout({ children, params }: LayoutProps) {
  const { slug } = await params;
  await requireCashierOrRedirect(slug, "/kasa");
  return <>{children}</>;
}
