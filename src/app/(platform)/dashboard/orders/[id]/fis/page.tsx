import { notFound } from "next/navigation";
import { getDashboardOrderById, getDashboardOrderItems } from "../../../../../../features/orders";
import { getCurrentRestaurantContext } from "../../../../../../features/tenants/membership";
import { AutoPrintOnMount } from "./auto-print-on-mount";

type ReceiptPageProps = {
  params: Promise<{ id: string }>;
};

function formatMoney(amount: number) {
  return `${new Intl.NumberFormat("tr-TR").format(amount)} TL`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}

export default async function ReceiptPage({ params }: ReceiptPageProps) {
  const { id } = await params;
  const context = await getCurrentRestaurantContext();
  if (!context) notFound();

  const [order, items] = await Promise.all([getDashboardOrderById(id), getDashboardOrderItems(id)]);
  if (!order) notFound();

  return (
    <section className="mx-auto max-w-2xl px-4 py-6">
      <AutoPrintOnMount />
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #receipt-print-area,
          #receipt-print-area * {
            visibility: visible !important;
          }
          #receipt-print-area {
            position: fixed;
            inset: 0;
            margin: 0 auto;
            width: 320px;
            background: white;
          }
        }
      `}</style>

      <div
        id="receipt-print-area"
        className="mx-auto w-full max-w-sm rounded-md border border-slate-300 bg-white p-4 font-mono text-[13px] text-slate-900 print:border-none print:p-0"
      >
        <p className="text-center font-semibold">Kendi Sepetim Restoran Yönetim Sistemleri</p>
        <p className="text-center">-----------------------------</p>
        <p className="text-center font-semibold">{context.restaurant.name}</p>
        <p className="text-center">({context.restaurant.slug})</p>
        <p className="text-center">-----------------------------</p>

        {order.order_channel === "table" ? (
          <div>
            <p className="font-semibold">MASA BILGISI</p>
            <p>Masa No: {order.table_number ?? "-"}</p>
            {order.note ? <p>Not: {order.note}</p> : null}
          </div>
        ) : (
          <div>
            <p className="font-semibold">MUSTERI BILGILERI</p>
            <p>{order.customer_name || "-"}</p>
            <p>Tel: {order.customer_phone || "-"}</p>
            {order.delivery_address ? <p>{order.delivery_address}</p> : null}
            {order.note ? <p>Not: {order.note}</p> : null}
          </div>
        )}

        <p className="text-center">-----------------------------</p>
        <p className="font-semibold">Adet  Urun                      Tutar</p>
        {items.map((item) => (
          <div key={item.id} className="mt-1">
            <div className="flex items-start justify-between gap-2">
              <p className="max-w-[72%]">
                {item.quantity}x {item.product_name_snapshot}
              </p>
              <p>{formatMoney(item.line_total)}</p>
            </div>
            {item.added_ingredients?.length ? (
              <p className="pl-2 text-[12px]">+ {item.added_ingredients.join(", ")}</p>
            ) : null}
            {item.removed_ingredients?.length ? (
              <p className="pl-2 text-[12px]">- {item.removed_ingredients.join(", ")}</p>
            ) : null}
            {item.item_note ? <p className="pl-2 text-[12px]">Not: {item.item_note}</p> : null}
          </div>
        ))}

        <p className="mt-2 text-center">-----------------------------</p>
        <div className="flex items-center justify-between font-semibold">
          <p>TOPLAM</p>
          <p>{formatMoney(order.total)}</p>
        </div>
        <p className="mt-1">ODEME: {order.payment_method === "cash" ? "NAKIT" : "KART"}</p>
        <p className="text-center">-----------------------------</p>

        <p className="mt-3 text-center">KendiSepetim QR</p>
        <p className="mt-2 text-center">{context.restaurant.slug}.kendisepetim.com</p>
        <p className="mt-2 text-center">KendiSepetim.com</p>
        <p className="text-center">KendiSepetim ile olusturuldu</p>
        <p className="text-center">{formatDate(order.created_at)}</p>
      </div>
    </section>
  );
}
