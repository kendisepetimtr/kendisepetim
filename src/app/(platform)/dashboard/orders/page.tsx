import Link from "next/link";
import { getCurrentRestaurantContext } from "../../../../features/tenants";
import { getDashboardOrdersForCurrentRestaurant, updateOrderStatus } from "../../../../features/orders";
import type { OrderChannel, OrderStatus } from "../../../../types";
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

type DashboardOrdersPageProps = {
  searchParams?: Promise<{ channel?: string }>;
};

const CHANNEL_LABELS: Record<OrderChannel | "all", string> = {
  all: "Tümü",
  online: "Online Siparişler",
  table: "Masa Siparişleri",
  package: "Paket Siparişler",
};

export default async function DashboardOrdersPage({ searchParams }: DashboardOrdersPageProps) {
  const resolved = searchParams ? await searchParams : {};
  const channelRaw = (resolved.channel ?? "all").toLowerCase();
  const activeChannel: OrderChannel | "all" =
    channelRaw === "online" || channelRaw === "table" || channelRaw === "package" ? channelRaw : "all";
  const [orders, restaurantContext] = await Promise.all([
    getDashboardOrdersForCurrentRestaurant(activeChannel),
    getCurrentRestaurantContext(),
  ]);

  if (!restaurantContext) {
    throw new Error("Unauthorized");
  }

  return (
    <section className="space-y-4">
      <OrdersRealtimeListener restaurantId={restaurantContext.restaurant.id} />

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="mb-4 grid gap-2 sm:grid-cols-3">
          {(["online", "table", "package"] as OrderChannel[]).map((ch) => {
            const active = activeChannel === ch;
            return (
              <Link
                key={ch}
                href={`/dashboard/orders?channel=${ch}`}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                  active
                    ? "border-gray-900 bg-gray-900 text-white"
                    : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
                }`}
              >
                {CHANNEL_LABELS[ch]}
              </Link>
            );
          })}
        </div>

        <p className="mb-3 text-xs text-gray-500">Aktif filtre: {CHANNEL_LABELS[activeChannel]}</p>

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
                      <span className="font-medium text-gray-900">Kanal:</span> {order.order_channel}
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

                  <div className="flex flex-wrap items-center gap-2">
                    {order.order_channel === "online" && order.status === "pending" ? (
                      <>
                        <form action={updateOrderStatus}>
                          <input type="hidden" name="order_id" value={order.id} />
                          <input type="hidden" name="status" value="confirmed" />
                          <button
                            type="submit"
                            className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500"
                          >
                            Kabul Et
                          </button>
                        </form>
                        <form action={updateOrderStatus}>
                          <input type="hidden" name="order_id" value={order.id} />
                          <input type="hidden" name="status" value="cancelled" />
                          <button
                            type="submit"
                            className="rounded-md bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:bg-rose-500"
                          >
                            Reddet
                          </button>
                        </form>
                      </>
                    ) : null}
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
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
