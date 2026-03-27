import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getDashboardOrderById,
  getDashboardOrderItems,
  updateOrderStatus,
} from "../../../../../features/orders";
import type { OrderStatus } from "../../../../../types";

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

type OrderDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  const { id } = await params;

  const [order, items] = await Promise.all([getDashboardOrderById(id), getDashboardOrderItems(id)]);
  if (!order) {
    notFound();
  }

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
            Siparis #{order.order_number ?? "-"}
          </h1>
          <p className="mt-1 text-sm text-gray-600">{formatDate(order.created_at)}</p>
        </div>
        <Link href="/dashboard/orders" className="text-sm text-gray-600 underline">
          Siparis listesine don
        </Link>
      </header>

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-base font-semibold text-gray-900">Siparis Ozeti</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <p className="text-sm text-gray-700">
            <span className="font-medium text-gray-900">Tip:</span> {order.order_type}
          </p>
          <p className="text-sm text-gray-700">
            <span className="font-medium text-gray-900">Odeme:</span> {order.payment_method}
          </p>
          <p className="text-sm text-gray-700">
            <span className="font-medium text-gray-900">Ara Toplam:</span>{" "}
            {formatTry(order.subtotal)}
          </p>
          <p className="text-sm text-gray-700">
            <span className="font-medium text-gray-900">Teslimat:</span>{" "}
            {formatTry(order.delivery_fee)}
          </p>
          <p className="text-sm font-semibold text-gray-900">
            <span>Genel Toplam:</span> {formatTry(order.total)}
          </p>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-base font-semibold text-gray-900">Musteri Bilgileri</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <p className="text-sm text-gray-700">
            <span className="font-medium text-gray-900">Ad:</span> {order.customer_name ?? "-"}
          </p>
          <p className="text-sm text-gray-700">
            <span className="font-medium text-gray-900">Telefon:</span>{" "}
            {order.customer_phone ?? "-"}
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
        <h2 className="text-base font-semibold text-gray-900">Siparis Kalemleri</h2>
        {items.length === 0 ? (
          <p className="mt-3 text-sm text-gray-600">Kalem bulunamadi.</p>
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
                <p className="text-sm font-medium text-gray-900">{formatTry(item.line_total)}</p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-base font-semibold text-gray-900">Notlar ve Durum</h2>
        <p className="mt-3 text-sm text-gray-700">
          <span className="font-medium text-gray-900">Not:</span> {order.note ?? "-"}
        </p>
        <form action={updateOrderStatus} className="mt-4 flex flex-wrap items-center gap-2">
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
            Durumu Guncelle
          </button>
        </form>
      </section>
    </section>
  );
}
