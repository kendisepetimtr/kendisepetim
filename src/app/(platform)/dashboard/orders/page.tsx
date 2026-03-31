import Link from "next/link";
import { getCouriersForCurrentRestaurant } from "../../../../features/couriers";
import { getCustomersForCurrentRestaurant } from "../../../../features/customers";
import { getActiveProductsByRestaurantId, getCategoriesByRestaurantId } from "../../../../features/menu/server";
import { getCurrentRestaurantContext } from "../../../../features/tenants";
import {
  closeOrder,
  getDashboardOrdersForCurrentRestaurant,
  getPendingTableOrderCountsByTableForCurrentRestaurant,
  updateOrderStatus,
} from "../../../../features/orders";
import { orderRequiresCourierOnClose } from "../../../../features/orders/constants";
import { orderStatusLabelTr } from "../../../../lib/order-status-tr";
import type { Courier, Order, OrderChannel, OrderStatus } from "../../../../types";
import { OrdersRealtimeListener } from "./orders-realtime-listener";
import { ComposerSavedModal } from "./composer-saved-modal";
import { OrderComposerOverlay } from "./order-composer-overlay";
import { PrepareAndPrintButton } from "./prepare-and-print-button";
import { TableOrdersMasaGrid } from "./table-orders-masa-grid";

const ORDER_STATUS_OPTIONS: OrderStatus[] = [
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "delivered",
  "cancelled",
];

function tableStatusLabel(order: Order): string {
  if (order.status === "cancelled") return "İptal";
  if (order.closed_at) return "Kapatıldı";
  return "Açık";
}

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
  searchParams?: Promise<{ channel?: string; table?: string; view?: string; composer?: string; pos?: string; saved?: string; savedMode?: string }>;
};

const CHANNEL_LABELS: Record<OrderChannel | "all", string> = {
  all: "Tümü",
  online: "Online Siparişler",
  table: "Masa Siparişleri",
  package: "Paket Siparişler",
};

function viewQuery(view: "active" | "history") {
  return view === "history" ? "&view=history" : "";
}

function courierLabel(order: Order): string {
  const c = order.couriers;
  if (!c || typeof c !== "object") return "—";
  const o = c as { first_name?: string; last_name?: string };
  const n = `${o.first_name ?? ""} ${o.last_name ?? ""}`.trim();
  return n || "—";
}

export default async function DashboardOrdersPage({ searchParams }: DashboardOrdersPageProps) {
  const resolved = searchParams ? await searchParams : {};
  const channelRaw = (resolved.channel ?? "all").toLowerCase();
  const requestedChannel: OrderChannel | "all" =
    channelRaw === "online" || channelRaw === "table" || channelRaw === "package" ? channelRaw : "all";
  const tableFilter = String(resolved.table ?? "").trim();
  const listView: "active" | "history" = resolved.view === "history" ? "history" : "active";
  const listMode = listView === "history" ? "closed" : "open";
  const composerOpen = resolved.composer === "1" && listView === "active";
  const posMode = resolved.pos === "1";
  const saved = resolved.saved === "1";
  const savedMode = resolved.savedMode === "package" ? "package" : resolved.savedMode === "table" ? "table" : "table";

  const restaurantContext = await getCurrentRestaurantContext();
  if (!restaurantContext) {
    throw new Error("Unauthorized");
  }
  const allowTable = restaurantContext.restaurant.enable_table_orders;
  const allowPackage = restaurantContext.restaurant.enable_package_orders;
  const availableChannels: OrderChannel[] = [
    "online",
    ...(allowTable ? (["table"] as const) : []),
    ...(allowPackage ? (["package"] as const) : []),
  ];
  const activeChannel: OrderChannel | "all" =
    requestedChannel === "all"
      ? (availableChannels[0] ?? "online")
      : availableChannels.includes(requestedChannel)
        ? requestedChannel
        : (availableChannels[0] ?? "online");

  const showTableMasaGrid = listView === "active" && activeChannel === "table" && !tableFilter;

  let orders: Order[] = [];
  let pendingByTable: Record<string, number> = {};
  let couriers: Courier[] = [];
  let composerCategories = [] as Awaited<ReturnType<typeof getCategoriesByRestaurantId>>;
  let composerProducts = [] as Awaited<ReturnType<typeof getActiveProductsByRestaurantId>>;
  let composerCustomers = [] as Awaited<ReturnType<typeof getCustomersForCurrentRestaurant>>;

  if (showTableMasaGrid) {
    pendingByTable = await getPendingTableOrderCountsByTableForCurrentRestaurant();
  } else {
    orders = await getDashboardOrdersForCurrentRestaurant(activeChannel, {
      tableNumber: tableFilter || undefined,
      list: listMode,
    });
    if (listView === "active") {
      try {
        couriers = await getCouriersForCurrentRestaurant();
      } catch {
        couriers = [];
      }
    }
  }

  if (composerOpen && (activeChannel === "table" || activeChannel === "package")) {
    const data = await Promise.all([
      getCategoriesByRestaurantId(restaurantContext.restaurant.id),
      getActiveProductsByRestaurantId(restaurantContext.restaurant.id),
      getPendingTableOrderCountsByTableForCurrentRestaurant(),
      getCustomersForCurrentRestaurant(),
    ]);
    composerCategories = data[0];
    composerProducts = data[1];
    pendingByTable = data[2];
    composerCustomers = data[3];
  }

  const detailQs = (orderId: string) => {
    const q = new URLSearchParams();
    if (listView === "history") q.set("view", "history");
    q.set("channel", activeChannel);
    if (tableFilter) q.set("table", tableFilter);
    const s = q.toString();
    return s ? `${orderId}?${s}` : orderId;
  };
  const composerHrefFor = (channel: "table" | "package", table?: string) =>
    `/dashboard/orders?channel=${channel}${table ? `&table=${encodeURIComponent(table)}` : ""}&composer=1${posMode ? "&pos=1" : ""}`;
  const closeSavedHref = `/dashboard/orders?channel=${activeChannel}${tableFilter ? `&table=${encodeURIComponent(tableFilter)}` : ""}${posMode ? "&pos=1" : ""}`;
  const continueSavedHref = composerHrefFor(savedMode === "package" ? "package" : "table", savedMode === "table" ? tableFilter || "1" : undefined);

  const activeNavQs = () => {
    const q = new URLSearchParams();
    q.set("channel", activeChannel);
    if (tableFilter) q.set("table", tableFilter);
    const s = q.toString();
    return s ? `?${s}` : "";
  };

  const historyNavQs = () => {
    const q = new URLSearchParams();
    q.set("view", "history");
    q.set("channel", activeChannel);
    if (tableFilter) q.set("table", tableFilter);
    return `?${q.toString()}`;
  };

  return (
    <section className="space-y-4">
      <OrdersRealtimeListener restaurantId={restaurantContext.restaurant.id} />

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-white p-2">
        <span className="px-2 text-xs font-medium text-gray-500">Görünüm:</span>
        <Link
          href={`/dashboard/orders${activeNavQs()}`}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
            listView === "active" ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-100"
          }`}
        >
          Aktif siparişler
        </Link>
        <Link
          href={`/dashboard/orders${historyNavQs()}`}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
            listView === "history" ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-100"
          }`}
        >
          Geçmiş siparişler
        </Link>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-5">

        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-gray-500">
          <span>
            {listView === "history" ? "Geçmiş — " : "Aktif — "}
            {CHANNEL_LABELS[activeChannel]}
            {activeChannel === "table" && tableFilter ? ` · Masa ${tableFilter}` : ""}
            {showTableMasaGrid ? " — Masalardan birini seçin" : ""}
          </span>
          {activeChannel === "table" && tableFilter ? (
            <Link
              href={`/dashboard/orders?channel=table${viewQuery(listView)}`}
              className="font-medium text-gray-700 underline"
            >
              Tüm masalar
            </Link>
          ) : null}
          {listView === "active" && activeChannel === "package" && allowPackage ? (
            <Link href={composerHrefFor("package")} className="font-medium text-indigo-700 underline">
              Paket sipariş al
            </Link>
          ) : null}
        </div>

        {showTableMasaGrid ? (
          <TableOrdersMasaGrid
            tableCount={Math.max(1, Math.min(200, restaurantContext.restaurant.table_count ?? 10))}
            pendingByTable={pendingByTable}
            view={listView}
          />
        ) : orders.length === 0 ? (
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              {listView === "history" ? "Geçmişte kayıt yok." : "Henüz sipariş yok."}
            </p>
            {listView === "active" && activeChannel === "table" && tableFilter ? (
              <Link
                href={composerHrefFor("table", tableFilter)}
                className="inline-flex rounded-lg border border-gray-900 bg-gray-900 px-3 py-2 text-sm font-medium text-white"
              >
                Sipariş al
              </Link>
            ) : null}
            {listView === "active" && activeChannel === "package" && allowPackage ? (
              <Link
                href={composerHrefFor("package")}
                className="inline-flex rounded-lg border border-gray-900 bg-gray-900 px-3 py-2 text-sm font-medium text-white"
              >
                Paket sipariş al
              </Link>
            ) : null}
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => {
              const needCourier = orderRequiresCourierOnClose(order.order_channel, order.order_type);
              const isOpen = listView === "active" && !order.closed_at;
              return (
                <article
                  key={order.id}
                  className="rounded-lg border border-gray-200 bg-gray-50 p-4"
                >
                  <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                      <p className="text-sm text-gray-700">
                        <span className="font-medium text-gray-900">Sipariş:</span>{" "}
                        <Link href={`/dashboard/orders/${detailQs(order.id)}`} className="underline">
                          {order.order_number ?? "-"}
                        </Link>
                      </p>
                      <p className="text-sm text-gray-700">
                        <span className="font-medium text-gray-900">Durum:</span>{" "}
                        {order.order_channel === "table" ? tableStatusLabel(order) : orderStatusLabelTr(order.status)}
                      </p>
                      <p className="text-sm text-gray-700">
                        <span className="font-medium text-gray-900">Kanal:</span> {order.order_channel}
                      </p>
                      <p className="text-sm text-gray-700">
                        <span className="font-medium text-gray-900">Müşteri:</span>{" "}
                        {order.customer_name ?? "-"}
                      </p>
                      {order.table_number ? (
                        <p className="text-sm text-gray-700">
                          <span className="font-medium text-gray-900">Masa:</span> {order.table_number}
                        </p>
                      ) : null}
                      <p className="text-sm text-gray-700">
                        <span className="font-medium text-gray-900">Tutar:</span> {formatTry(order.total)}
                      </p>
                      <p className="text-sm text-gray-700 sm:col-span-2">
                        <span className="font-medium text-gray-900">Oluşturulma:</span>{" "}
                        {formatDate(order.created_at)}
                      </p>
                      {listView === "history" && order.closed_at ? (
                        <>
                          <p className="text-sm text-gray-700 sm:col-span-2">
                            <span className="font-medium text-gray-900">Kapanış:</span>{" "}
                            {formatDate(order.closed_at)}
                          </p>
                          <p className="text-sm text-gray-700 sm:col-span-2">
                            <span className="font-medium text-gray-900">Kurye:</span> {courierLabel(order)}
                          </p>
                        </>
                      ) : null}
                    </div>

                    <div className="flex flex-col flex-wrap gap-2 sm:flex-row sm:items-center">
                      {isOpen ? (
                        <>
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
                          {order.order_channel === "online" ? (
                            <form action={updateOrderStatus} className="flex flex-wrap items-center gap-2">
                              <input type="hidden" name="order_id" value={order.id} />
                              <select
                                name="status"
                                defaultValue={order.status}
                                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                              >
                                {ORDER_STATUS_OPTIONS.map((status) => (
                                  <option key={status} value={status}>
                                    {orderStatusLabelTr(status)}
                                  </option>
                                ))}
                              </select>
                              <button
                                type="submit"
                                className="rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-black"
                              >
                                Güncelle
                              </button>
                            </form>
                          ) : null}
                          {(order.order_channel === "table" || order.order_channel === "package") ? (
                            <>
                              <form action={updateOrderStatus}>
                                <input type="hidden" name="order_id" value={order.id} />
                                <input type="hidden" name="status" value="cancelled" />
                                <button
                                  type="submit"
                                  className="rounded-md bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:bg-rose-500"
                                >
                                  İptal et
                                </button>
                              </form>
                              <PrepareAndPrintButton
                                orderId={order.id}
                                className="rounded-md bg-indigo-700 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-600 disabled:opacity-60"
                              />
                            </>
                          ) : null}
                          <form action={closeOrder} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                            <input type="hidden" name="order_id" value={order.id} />
                            {needCourier ? (
                              <select
                                name="courier_id"
                                required
                                className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm"
                                defaultValue=""
                              >
                                <option value="" disabled>
                                  Kurye seçin
                                </option>
                                {couriers.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.first_name} {c.last_name}
                                    {c.pos_number ? ` · POS ${c.pos_number}` : ""}
                                  </option>
                                ))}
                              </select>
                            ) : null}
                            <button
                              type="submit"
                              className="rounded-md border border-gray-400 bg-white px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50"
                            >
                              Ödeme alındı — kapat
                            </button>
                          </form>
                        </>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
      {composerOpen && (activeChannel === "table" || activeChannel === "package") ? (
        <OrderComposerOverlay
          mode={activeChannel}
          closeHref={`/dashboard/orders?channel=${activeChannel}${tableFilter ? `&table=${encodeURIComponent(tableFilter)}` : ""}${posMode ? "&pos=1" : ""}`}
          switchTableHref={allowTable ? composerHrefFor("table", tableFilter || "1") : undefined}
          switchPackageHref={allowPackage ? composerHrefFor("package") : undefined}
          enableTableOrders={allowTable}
          enablePackageOrders={allowPackage}
          posMode={posMode}
          initialTable={activeChannel === "table" ? tableFilter : undefined}
          tableCount={Math.max(1, Math.min(200, restaurantContext.restaurant.table_count ?? 10))}
          pendingByTable={pendingByTable}
          categories={composerCategories}
          products={composerProducts}
          customers={composerCustomers}
        />
      ) : null}
      {saved ? (
        <ComposerSavedModal
          message="Sipariş başarıyla kaydedildi."
          closeHref={closeSavedHref}
          continueHref={continueSavedHref}
        />
      ) : null}
    </section>
  );
}
