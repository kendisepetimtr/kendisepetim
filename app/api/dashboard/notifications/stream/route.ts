import { getAuthenticatedOwnerTenant } from "@/lib/dashboard/owner-tenant";
import { createActivityLogSseStream } from "@/lib/notification-stream-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const tenant = await getAuthenticatedOwnerTenant();
  if (!tenant) {
    return new Response(JSON.stringify({ ok: false, error: "Oturum bulunamadı." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const stream = createActivityLogSseStream(tenant.id, request.signal);
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
