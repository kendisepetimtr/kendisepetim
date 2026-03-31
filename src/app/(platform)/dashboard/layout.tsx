import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentRestaurantContext } from "../../../features/tenants";
import {
  getPendingOnlineOrdersCountForCurrentRestaurant,
  getPendingPackageOrdersCountForCurrentRestaurant,
  getPendingTableOrdersCountForCurrentRestaurant,
} from "../../../features/orders";
import { createServerSupabaseClient } from "../../../lib/supabase";
import { buildPublicMenuUrls } from "../../../lib/tenant";
import { DashboardShellV7 } from "./dashboard-shell-v7";

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
    redirect("/onboarding/restaurant");
  }

  const menuUrls = buildPublicMenuUrls(restaurantContext.restaurant.slug);
  const tenantAdminHref = `/t/${restaurantContext.restaurant.slug}/admin`;
  const tenantWaiterHref = `/t/${restaurantContext.restaurant.slug}/garson`;
  const tenantCashierHref =
    restaurantContext.restaurant.enable_table_orders || restaurantContext.restaurant.enable_package_orders
      ? `/dashboard/orders?channel=${restaurantContext.restaurant.enable_table_orders ? "table" : "package"}&pos=1`
      : null;
  const [pendingOnlineOrdersCount, pendingTableOrdersCount, pendingPackageOrdersCount] = await Promise.all([
    getPendingOnlineOrdersCountForCurrentRestaurant(),
    getPendingTableOrdersCountForCurrentRestaurant(),
    getPendingPackageOrdersCountForCurrentRestaurant(),
  ]);

  return (
    <DashboardShellV7
      restaurantName={restaurantContext.restaurant.name}
      logoUrl={restaurantContext.restaurant.logo_url}
      userEmail={user.email ?? ""}
      showUiPreviewLink={process.env.NODE_ENV === "development"}
      customerMenuHref={menuUrls.primaryHref}
      customerMenuFallbackHref={menuUrls.fallbackHref}
      tenantAdminHref={tenantAdminHref}
      tenantWaiterHref={tenantWaiterHref}
      tenantCashierHref={tenantCashierHref}
      pendingOnlineOrdersCount={pendingOnlineOrdersCount}
      pendingTableOrdersCount={pendingTableOrdersCount}
      pendingPackageOrdersCount={pendingPackageOrdersCount}
      enableTableOrders={restaurantContext.restaurant.enable_table_orders}
      enablePackageOrders={restaurantContext.restaurant.enable_package_orders}
    >
      {children}
    </DashboardShellV7>
  );
}
