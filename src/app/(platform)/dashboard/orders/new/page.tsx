import { notFound, redirect } from "next/navigation";
import { getActiveProductsByRestaurantId, getCategoriesByRestaurantId } from "../../../../../features/menu/server";
import { getCurrentRestaurantContext } from "../../../../../features/tenants";
import { CashierOrderClient } from "./cashier-order-client";

type DashboardNewOrderPageProps = {
  searchParams?: Promise<{ channel?: string; table?: string }>;
};

export default async function DashboardNewOrderPage({ searchParams }: DashboardNewOrderPageProps) {
  const resolved = searchParams ? await searchParams : {};
  const channel = String(resolved.channel ?? "").trim().toLowerCase();
  const table = String(resolved.table ?? "").trim();

  const context = await getCurrentRestaurantContext();
  if (!context) notFound();

  if (channel !== "table" && channel !== "package") {
    redirect("/dashboard/orders");
  }
  if (channel === "table" && !context.restaurant.enable_table_orders) {
    redirect("/dashboard/orders?channel=online");
  }
  if (channel === "package" && !context.restaurant.enable_package_orders) {
    redirect("/dashboard/orders?channel=online");
  }
  if (channel === "table" && !/^\d+$/.test(table)) {
    redirect("/dashboard/orders?channel=table");
  }

  const [categories, products] = await Promise.all([
    getCategoriesByRestaurantId(context.restaurant.id),
    getActiveProductsByRestaurantId(context.restaurant.id),
  ]);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6">
      <CashierOrderClient
        mode={channel}
        tableNumber={channel === "table" ? table : undefined}
        categories={categories}
        products={products}
      />
    </main>
  );
}
