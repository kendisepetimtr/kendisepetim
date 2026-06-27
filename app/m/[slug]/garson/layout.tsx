import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Garson",
  robots: { index: false, follow: false },
};

export default function TenantGarsonLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
