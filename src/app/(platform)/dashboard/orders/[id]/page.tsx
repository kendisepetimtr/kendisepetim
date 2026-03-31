import Link from "next/link";
import { notFound } from "next/navigation";
import { getCouriersForCurrentRestaurant } from "../../../../../features/couriers";
import {
  closeOrder,
  closeTableSession,
  getDashboardOrderById,
  getDashboardOrderItems,
  updateOrderStatus,
} from "../../../../../features/orders";
import { orderRequiresCourierOnClose } from "../../../../../features/orders/constants";
import { orderStatusLabelTr } from "../../../../../lib/order-status-tr";
import type { OrderStatus } from "../../../../../types";
import { PrepareAndPrintButton } from "../prepare-and-print-button";

const ORDER_STATUS_OPTIONS: OrderStatus[] = [
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "delivered",
  "cancelled",
];

function tableStatusLabel(order: { status: OrderStatus; closed_at: string | null }): string {
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

type OrderDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ view?: string; channel?: string; table?: string }>;
};

export default async function OrderDetailPage({ params, searchParams }: OrderDetailPageProps) {
  const { id } = await params;
  const resolvedSearch = searchParams ? await searchParams : {};
  const fromHistory = resolvedSearch.view === "history";

  const [order, items] = await Promise.all([getDashboardOrderById(id), getDashboardOrderItems(id)]);
  if (!order) {
    notFound();
  }

  let couriers: Awaited<ReturnType<typeof getCouriersForCurrentRestaurant>> = [];
  if (!order.closed_at) {
    try {
      couriers = await getCouriersForCurrentRestaurant();
    } catch {
      couriers = [];
    }
  }

  const listBackHref =
    order.order_channel === "table"
      ? `/dashboard/orders?channel=table${order.table_number ? `&table=${encodeURIComponent(order.table_number)}` : ""}${fromHistory ? "&view=history" : ""}`
      : order.order_channel === "package"
        ? `/dashboard/orders?channel=package${fromHistory ? "&view=history" : ""}`
        : `/dashboard/orders?channel=online${fromHistory ? "&view=history" : ""}`;

  const needCourier = orderRequiresCourierOnClose(order.order_channel, order.order_type);
  const courierName = order.couriers
    ? `${order.couriers.first_name} ${order.couriers.last_name}`.trim()
    : "—";

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-lg font-semibold tracking-tight text-gray-900">
            Sipariş #{order.order_number ?? "-"}
          </p>
          <p className="mt-1 text-sm text-gray-600">{formatDate(order.created_at)}</p>
        </div>
        <Link href={listBackHref} className="text-sm text-gray-600 underline">
          Sipariş listesine dön
        </Link>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-base font-semibold text-gray-900">Sipariş özeti</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <p className="text-sm text-gray-700">
            <span className="font-medium text-gray-900">Durum:</span>{" "}
            {order.order_channel === "table" ? tableStatusLabel(order) : orderStatusLabelTr(order.status)}
          </p>
          <p className="text-sm text-gray-700">
            <span className="font-medium text-gray-900">Kanal:</span> {order.order_channel}
          </p>
          <p className="text-sm text-gray-700">
            <span className="font-medium text-gray-900">Tip:</span> {order.order_type}
          </p>
          <p className="text-sm text-gray-700">
            <span className="font-medium text-gray-900">Ödeme:</span> {order.payment_method}
          </p>
          <p className="text-sm text-gray-700">
            <span className="font-medium text-gray-900">Ara toplam:</span> {formatTry(order.subtotal)}
          </p>
          <p className="text-sm text-gray-700">
            <span className="font-medium text-gray-900">Teslimat:</span> {formatTry(order.delivery_fee)}
          </p>
          <p className="text-sm font-semibold text-gray-900 sm:col-span-2">
            <span>Genel toplam:</span> {formatTry(order.total)}
          </p>
          {order.closed_at ? (
            <p className="text-sm text-gray-700 sm:col-span-2">
              <span className="font-medium text-gray-900">Kapanış:</span> {formatDate(order.closed_at)}
            </p>
          ) : null}
          <p className="text-sm text-gray-700 sm:col-span-2">
            <span className="font-medium text-gray-900">Kurye (kapatmada):</span> {courierName}
          </p>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-base font-semibold text-gray-900">Müşteri bilgileri</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <p className="text-sm text-gray-700">
            <span className="font-medium text-gray-900">Ad:</span> {order.customer_name ?? "-"}
          </p>
          <p className="text-sm text-gray-700">
            <span className="font-medium text-gray-900">Telefon:</span> {order.customer_phone ?? "-"}
          </p>
          {order.table_number ? (
            <p className="text-sm text-gray-700">
              <span className="font-medium text-gray-900">Masa:</span> {order.table_number}
            </p>
          ) : null}
          {order.delivery_address ? (
            <p className="text-sm text-gray-700 sm:col-span-2">
              <span className="font-medium text-gray-900">Adres:</span> {order.delivery_address}
            </p>
          ) : null}
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-base font-semibold text-gray-900">Sipariş kalemleri</h2>
        {items.length === 0 ? (
          <p className="mt-3 text-sm text-gray-600">Kalem bulunamadı.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {items.map((item) => (
              <article
                key={item.id}
                className="flex items-center justify-between rounded-lg border border-gray-200 p-3"
              >
                <p className="text-sm text-gray-800">
                  {item.quantity}x {item.product_name_snapshot}
                </p>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{formatTry(item.line_total)}</p>
                  {item.removed_ingredients && item.removed_ingredients.length > 0 ? (
                    <p className="text-xs text-gray-500">Çıkar: {item.removed_ingredients.join(", ")}</p>
                  ) : null}
                  {item.added_ingredients && item.added_ingredients.length > 0 ? (
                    <p className="text-xs text-gray-500">Ekle: {item.added_ingredients.join(", ")}</p>
                  ) : null}
                  {item.item_note ? <p className="text-xs text-gray-500">Not: {item.item_note}</p> : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-base font-semibold text-gray-900">Notlar ve işlemler</h2>
        <p className="mt-3 text-sm text-gray-700">
          <span className="font-medium text-gray-900">Not:</span> {order.note ?? "-"}
        </p>

        {!order.closed_at ? (
          <>
            <form action={updateOrderStatus} className="mt-4 flex flex-wrap items-center gap-2">
              <input type="hidden" name="order_id" value={order.id} />
              {order.order_channel === "online" && order.status === "pending" ? (
                <>
                  <button
                    type="submit"
                    name="status"
                    value="confirmed"
                    className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500"
                  >
                    Kabul Et
                  </button>
                  <button
                    type="submit"
                    name="status"
                    value="cancelled"
                    className="rounded-md bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:bg-rose-500"
                  >
                    Reddet
                  </button>
                </>
              ) : null}
              {order.order_channel === "online" ? (
                <>
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
                    Durumu güncelle
                  </button>
                </>
              ) : (
                <>
                  <input type="hidden" name="status" value="cancelled" />
                  <button
                    type="submit"
                    className="rounded-md bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:bg-rose-500"
                  >
                    Siparişi iptal et
                  </button>
                </>
              )}
            </form>

            {(order.order_channel === "table" || order.order_channel === "package") ? (
              <div className="mt-3">
                <PrepareAndPrintButton
                  orderId={order.id}
                  className="rounded-md bg-indigo-700 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-600 disabled:opacity-60"
                />
              </div>
            ) : null}

            <form action={closeOrder} className="mt-4 flex flex-col gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 sm:flex-row sm:items-end">
              <input type="hidden" name="order_id" value={order.id} />
              {needCourier ? (
                <div className="flex-1">
                  <label className="mb-1 block text-xs font-medium text-gray-700">Kurye (zorunlu)</label>
                  <select
                    name="courier_id"
                    required
                    className="w-full rounded-md border border-amber-300 bg-white px-3 py-2 text-sm"
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Seçin
                    </option>
                    {couriers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.first_name} {c.last_name}
                        {c.pos_number ? ` · POS ${c.pos_number}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
              <button
                type="submit"
                className="rounded-md border border-gray-800 bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black"
              >
                Ödeme alındı — siparişi kapat
              </button>
            </form>

            {order.order_channel === "table" && order.table_session_id ? (
              <form action={closeTableSession} className="mt-3">
                <input type="hidden" name="table_session_id" value={order.table_session_id} />
                <button
                  type="submit"
                  className="text-sm font-medium text-amber-900 underline hover:text-amber-700"
                >
                  Bu masanın tüm açık siparişlerini tek seferde kapat (oturumu kapat)
                </button>
              </form>
            ) : null}
          </>
        ) : (
          <p className="mt-4 text-sm text-gray-600">Bu sipariş kapatılmış; düzenleme yapılamaz.</p>
        )}
      </section>
    </section>
  );
}
