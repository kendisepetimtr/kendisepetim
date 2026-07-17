import { NextResponse } from "next/server";
import { signOutDashboardSession } from "@/lib/dashboard/sign-out";

export const dynamic = "force-dynamic";

export async function POST() {
  await signOutDashboardSession();
  const res = NextResponse.json({ ok: true });
  res.headers.set("Cache-Control", "no-store");
  return res;
}
