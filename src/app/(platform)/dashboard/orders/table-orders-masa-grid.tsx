 "use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

type TableOrdersMasaGridProps = {
  tableCount: number;
  pendingByTable: Record<string, number>;
  view?: "active" | "history";
};

export function TableOrdersMasaGrid({
  tableCount,
  pendingByTable,
  view = "active",
}: TableOrdersMasaGridProps) {
  const tables = Array.from({ length: tableCount }, (_, i) => String(i + 1));
  const vq = view === "history" ? "&view=history" : "";
  const searchParams = useSearchParams();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const posMode = searchParams?.get("pos") === "1";
  const posQ = posMode ? "&pos=1" : "";

  useEffect(() => {
    if (posMode) {
      setIsFullscreen(true);
    }
  }, [posMode]);

  useEffect(() => {
    if (!isFullscreen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsFullscreen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isFullscreen]);

  const gridNode = (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
      {tables.map((tableNo) => {
        const pending = pendingByTable[tableNo] ?? 0;
        const occupied = pending > 0;
        return (
          <div
            key={tableNo}
            className={`relative flex min-h-[132px] flex-col items-center justify-center rounded-2xl border-2 px-4 py-8 text-center text-base font-medium shadow-sm transition ${
              occupied
                ? "border-amber-400 bg-amber-50 text-gray-900"
                : "border-emerald-200 bg-emerald-50/40 text-gray-800"
            }`}
          >
            <Link
              href={`/dashboard/orders?channel=table&table=${encodeURIComponent(tableNo)}${vq}${posQ}`}
              className="text-lg font-semibold text-gray-900 underline-offset-2 hover:underline"
            >
              Masa {tableNo}
            </Link>
            <Link
              href={`/dashboard/orders?channel=table&table=${encodeURIComponent(tableNo)}&composer=1${vq}${posQ}`}
              className="mt-3 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              Sipariş al
            </Link>
            {pending === 0 ? (
              <span className="mt-1 text-xs text-gray-500">Müsait</span>
            ) : null}
            {pending > 0 ? (
              <span className="absolute right-2 top-2 inline-flex h-7 min-w-[1.75rem] items-center justify-center rounded-full bg-red-600 px-1.5 text-xs font-semibold text-white">
                {pending}
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-4 border-t border-gray-100 pt-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-gray-600">
          Kasiyer bekleme ekranı masalardır. Açık hesabı olan masalar turuncu çerçevedir; rozet açık sipariş
          adedini gösterir. Masaya tıklayınca direkt sipariş alma ekranı açılır.
        </p>
        {!posMode ? (
          <button
            type="button"
            onClick={() => setIsFullscreen(true)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
          >
            Tam ekran
          </button>
        ) : null}
      </div>

      {gridNode}

      {isFullscreen ? (
        <div className="fixed inset-0 z-[80] bg-gray-950/80 p-4 md:p-6">
          <div className="mx-auto flex h-full w-full max-w-[1600px] flex-col rounded-2xl border border-gray-200 bg-white p-4 md:p-6">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h3 className="text-base font-semibold text-gray-900">Masalar · Tam ekran</h3>
              <div className="flex items-center gap-2">
                <span className="hidden text-xs text-gray-500 sm:inline">ESC ile çıkabilirsiniz</span>
                <button
                  type="button"
                  onClick={() => setIsFullscreen(false)}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
                >
                  Geri
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-auto pr-1">{gridNode}</div>
          </div>
        </div>
      ) : null}

      <p className="text-xs text-gray-500">
        Masa sayısını{" "}
        <Link href="/dashboard/settings" className="underline">
          Ayarlar
        </Link>{" "}
        üzerinden güncelleyebilirsiniz.
      </p>
    </div>
  );
}
