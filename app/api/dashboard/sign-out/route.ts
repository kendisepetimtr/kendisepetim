import { NextResponse } from "next/server";
import { signOutDashboardSession } from "@/lib/dashboard/sign-out";

export const dynamic = "force-dynamic";

export async function POST() {
  await signOutDashboardSession();
  return NextResponse.json({ ok: true });
}
