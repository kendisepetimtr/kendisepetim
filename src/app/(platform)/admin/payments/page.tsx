import { createServerSupabaseClient } from "../../../../lib/supabase";

export default async function SuperadminPaymentsPage() {
  const supabase = await createServerSupabaseClient();

  const { count: totalOrders } = await supabase.from("orders").select("id", { count: "exact", head: true });
  const { count: onlineOrders } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("order_channel", "online");
  const { count: tableOrders } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("order_channel", "table");
  const { count: packageOrders } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("order_channel", "package");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Ödemeler</h1>
        <p className="mt-1 text-sm text-slate-400">
          Bu ekran Faz 3.1 için başlangıç görünümüdür. Bir sonraki adımda gerçek ödeme hareketleri eklenecek.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Toplam Sipariş</p>
          <p className="mt-2 text-2xl font-semibold text-white">{totalOrders ?? 0}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Online</p>
          <p className="mt-2 text-2xl font-semibold text-white">{onlineOrders ?? 0}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Masa</p>
          <p className="mt-2 text-2xl font-semibold text-white">{tableOrders ?? 0}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Paket</p>
          <p className="mt-2 text-2xl font-semibold text-white">{packageOrders ?? 0}</p>
        </div>
      </div>
    </div>
  );
}
