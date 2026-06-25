import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Panel",
  description: "Restoran yonetim paneli — KendiSepetim.",
};

/** Oturum kontrolü middleware'de; profil senkronu client server action ile. */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return children;
}
