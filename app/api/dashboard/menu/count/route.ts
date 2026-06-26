import { NextResponse } from "next/server";
import { getDashboardMenuProductCount } from "@/lib/dashboard/menu-load";

export const dynamic = "force-dynamic";

export async function GET() {
  const count = await getDashboardMenuProductCount();
  return NextResponse.json({ count });
}
