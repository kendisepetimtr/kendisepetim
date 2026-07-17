import SuperadminShell from "@/components/superadmin/superadmin-shell";
import type { ReactNode } from "react";

export default function SuperadminPanelLayout({ children }: { children: ReactNode }) {
  return <SuperadminShell>{children}</SuperadminShell>;
}
