import { type NextRequest } from "next/server";
import { parseMenuSubdomainFromHost } from "@/lib/menu-subdomain";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const host = request.headers.get("host");
  const slug = parseMenuSubdomainFromHost(host);
  let rewrite: URL | undefined;
  if (slug && request.nextUrl.pathname === "/") {
    const u = request.nextUrl.clone();
    u.pathname = `/m/${slug}`;
    rewrite = u;
  } else if (slug && request.nextUrl.pathname === "/favicon.ico") {
    const u = request.nextUrl.clone();
    u.pathname = `/m/${slug}/favicon`;
    rewrite = u;
  }
  return updateSession(request, { rewrite });
}

export const config = {
  matcher: [
    /*
     * Statik dosya ve görüntüleri hariç tut — gereksiz Supabase çağrısı olmasın.
     */
    "/((?!_next/static|_next/image|sw\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
