import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Panel",
  description: "Restoran yonetim paneli — KendiSepetim.",
};

/** Panel oturumu ve ayar kaydı dinamik; HTML önbelleği eski JS chunk'larını tutmasın. */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function headers() {
  return {
    "Cache-Control": "no-store, no-cache, must-revalidate",
  };
}

/** Oturum kontrolü middleware'de; profil `/api/dashboard/tenant` ile senkronize edilir. */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return children;
}
