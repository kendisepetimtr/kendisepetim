import Link from "next/link";
import { getCurrentRestaurantContext } from "../../../../features/tenants";
import { getDashboardOrdersForCurrentRestaurant, updateOrderStatus } from "../../../../features/orders";
import type { OrderStatus } from "../../../../types";
import { OrdersRealtimeListener } from "./orders-realtime-listener";

const ORDER_STATUS_OPTIONS: OrderStatus[] = [
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "delivered",
  "cancelled",
];

function formatTry(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
  }).format(value);
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("tr-TR");
}

export default async function DashboardOrdersPage() {
  const [orders, restaurantContext] = await Promise.all([
    getDashboardOrdersForCurrentRestaurant(),
    getCurrentRestaurantContext(),
  ]);

  if (!restaurantContext) {
    throw new Error("Unauthorized");
  }

  return (
    <section className="space-y-4">
      <OrdersRealtimeListener restaurantId={restaurantContext.restaurant.id} />
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Orders</h1>
        <p className="mt-1 text-sm text-gray-600">
          Son siparisleri goruntuleyin ve mutfak akisina gore durumlarini guncelleyin.
        </p>
      </header>

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        {orders.length === 0 ? (
          <p className="text-sm text-gray-600">Henuz siparis bulunmuyor.</p>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <article
                key={order.id}
                className="rounded-lg border border-gray-200 bg-gray-50 p-4"
              >
                <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                    <p className="text-sm text-gray-700">
                      <span className="font-medium text-gray-900">Siparis:</span>{" "}
                      <Link href={`/dashboard/orders/${order.id}`} className="underline">
                        {order.order_number ?? "-"}
                      </Link>
                    </p>
                    <p className="text-sm text-gray-700">
                      <span className="font-medium text-gray-900">Tip:</span> {order.order_type}
                    </p>
                    <p className="text-sm text-gray-700">
                      <span className="font-medium text-gray-900">Musteri:</span>{" "}
                      {order.customer_name ?? "-"}
                    </p>
                    <p className="text-sm text-gray-700">
                      <span className="font-medium text-gray-900">Odeme:</span>{" "}
                      {order.payment_method}
                    </p>
                    <p className="text-sm text-gray-700">
                      <span className="font-medium text-gray-900">Tutar:</span>{" "}
                      {formatTry(order.total)}
                    </p>
                    <p className="text-sm text-gray-700 sm:col-span-2">
                      <span className="font-medium text-gray-900">Zaman:</span>{" "}
                      {formatDate(order.created_at)}
                    </p>
                  </div>

                  <form action={updateOrderStatus} className="flex items-center gap-2">
                    <input type="hidden" name="order_id" value={order.id} />
                    <select
                      name="status"
                      defaultValue={order.status}
                      className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                    >
                      {ORDER_STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      className="rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-black"
                    >
                      Guncelle
                    </button>
                  </form>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
