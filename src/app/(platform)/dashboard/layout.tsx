import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "../../../lib/supabase";
import { getCurrentRestaurantContext } from "../../../features/tenants";

const DASHBOARD_NAV_ITEMS = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/orders", label: "Orders" },
  { href: "/dashboard/categories", label: "Categories" },
  { href: "/dashboard/products", label: "Products" },
  { href: "/dashboard/settings", label: "Settings" },
];

export default async function ProtectedDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const restaurantContext = await getCurrentRestaurantContext();
  if (!restaurantContext) {
    redirect("/login?error=Aktif+restoran+yetkisi+bulunamadi.");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <p className="text-sm font-semibold text-gray-900">KendiSepetim Dashboard</p>
          <div className="hidden text-right sm:block">
            <p className="text-xs font-medium text-gray-700">{restaurantContext.restaurant.name}</p>
            <p className="text-xs text-gray-500">{user.email}</p>
          </div>
        </div>
        <nav className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 pb-3 sm:hidden sm:px-6">
          {DASHBOARD_NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-6 sm:px-6 md:grid-cols-[220px_1fr]">
        <aside className="hidden h-fit rounded-xl border border-gray-200 bg-white p-3 md:block">
          <nav className="space-y-1">
            {DASHBOARD_NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        <main>{children}</main>
      </div>
    </div>
  );
}
