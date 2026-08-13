"use client";

import MusteriShell from "@/components/musteri/musteri-shell";
import { isMusteriAuthPath } from "@/lib/musteri/paths";
import type { MusteriSession } from "@/lib/musteri/session";
import { usePathname } from "next/navigation";

type Props = {
  session: MusteriSession;
  children: React.ReactNode;
};

export default function MusteriAuthGate({ session, children }: Props) {
  const pathname = usePathname() ?? "";
  if (isMusteriAuthPath(pathname)) return children;
  return <MusteriShell session={session}>{children}</MusteriShell>;
}
