import type { Metadata } from "next";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Süperadmin",
  robots: { index: false, follow: false },
};

export default function SuperadminLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-background text-on-background">{children}</div>;
}
