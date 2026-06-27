import { getAuthenticatedWaiterTenantByCookie } from "@/lib/garson/waiter-tenant";
import { createActivityLogSseStream } from "@/lib/notification-stream-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await getAuthenticatedWaiterTenantByCookie();
  if (!auth.ok) {
    return new Response(JSON.stringify({ ok: false, error: auth.error }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const stream = createActivityLogSseStream(auth.tenant.id, request.signal);
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
