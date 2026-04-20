"use client";

import CustomerFormModal from "@/components/dashboard/customer-form-modal";
import { formatAddressOneLine } from "@/lib/customer-address";
import {
  getLocalCustomers,
  saveLocalCustomers,
  type LocalCustomer,
  type LocalCustomersState,
} from "@/lib/local-customers";
import { paymentMethodLabel } from "@/lib/tenant-payment";
import { type FormEvent, useCallback, useEffect, useId, useMemo, useState } from "react";

type CustomersManagerProps = {
  subdomain: string;
};

export default function CustomersManager({ subdomain }: CustomersManagerProps) {
  const baseId = useId();
  const [state, setState] = useState<LocalCustomersState>({ customers: [] });
  const [hydrated, setHydrated] = useState(false);
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingCustomer, setEditingCustomer] = useState<LocalCustomer | null>(null);

  const load = useCallback(() => {
    setState(getLocalCustomers(subdomain));
  }, [subdomain]);

  useEffect(() => {
    load();
    setHydrated(true);
  }, [load]);

  function persist(next: LocalCustomersState) {
    setState(next);
    saveLocalCustomers(subdomain, next);
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return state.customers;
    return state.customers.filter((c) => {
      const blob = [
        c.firstName,
        c.lastName,
        formatAddressOneLine(c.address),
        c.phone,
        c.email,
        c.orderSource,
        c.lastPaymentMethod
          ? paymentMethodLabel(c.lastPaymentMethod, c.lastMealCardBrandId)
          : "",
      ]
        .join(" ")
        .toLowerCase();
      return blob.includes(q);
    });
  }, [state.customers, query]);

  function openCreate() {
    setModalMode("create");
    setEditingCustomer(null);
    setModalOpen(true);
  }

  function openEdit(c: LocalCustomer) {
    setModalMode("edit");
    setEditingCustomer(c);
    setModalOpen(true);
  }

  function handleSaveCustomer(customer: LocalCustomer) {
    const exists = state.customers.some((c) => c.id === customer.id);
    if (exists) {
      persist({ customers: state.customers.map((c) => (c.id === customer.id ? customer : c)) });
    } else {
      persist({ customers: [customer, ...state.customers] });
    }
  }

  function handleDelete(c: LocalCustomer) {
    if (!window.confirm(`${c.firstName} ${c.lastName} kaydını silmek istediğinize emin misiniz?`)) return;
    persist({ customers: state.customers.filter((x) => x.id !== c.id) });
  }

  function handleExport(e: FormEvent) {
    e.preventDefault();
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `musteriler-${subdomain}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-secondary">
            Sipariş sırasında veya manuel eklenen müşteri kayıtları bu cihazda saklanır.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleExport}
            className="rounded-xl border border-surface-container-highest bg-white px-4 py-2.5 text-sm font-semibold text-on-background hover:bg-surface-container-low"
          >
            JSON dışa aktar
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white hover:bg-primary-container"
          >
            Müşteri ekle
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-4 shadow-sm sm:p-5">
        <label className="block text-xs font-medium text-secondary" htmlFor={`${baseId}-search`}>
          Listede ara
        </label>
        <div className="relative mt-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-secondary">
            <span className="material-symbols-outlined text-[20px]">search</span>
          </span>
          <input
            id={`${baseId}-search`}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ad, telefon, adres, kaynak…"
            className="w-full rounded-xl border border-surface-container-highest bg-white py-2.5 pl-10 pr-3 text-sm text-on-background placeholder:text-secondary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {!hydrated ? (
        <p className="text-center text-sm text-secondary">Yükleniyor…</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-outline/40 bg-surface-container-low/50 px-6 py-16 text-center">
          <span className="material-symbols-outlined text-5xl text-secondary/40">group_off</span>
          <p className="mt-4 font-headline text-lg font-bold text-on-background">
            {state.customers.length === 0 ? "Henüz müşteri yok" : "Eşleşen kayıt yok"}
          </p>
          <p className="mt-2 text-sm text-secondary">
            {state.customers.length === 0
              ? "Yeni müşteri ekleyin veya sipariş akışı bağlandığında kayıtlar burada görünecek."
              : "Arama terimini değiştirmeyi deneyin."}
          </p>
          {state.customers.length === 0 ? (
            <button
              type="button"
              onClick={openCreate}
              className="mt-6 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-primary-container"
            >
              İlk müşteriyi ekle
            </button>
          ) : null}
        </div>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-2xl border border-surface-container-highest bg-surface-container-lowest shadow-sm lg:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-surface-container-high bg-surface-container-low/80 text-xs font-semibold uppercase tracking-wider text-secondary">
                <tr>
                  <th className="px-4 py-3">Müşteri</th>
                  <th className="px-4 py-3">İletişim</th>
                  <th className="px-4 py-3">Adres</th>
                  <th className="px-4 py-3">Kaynak</th>
                  <th className="px-4 py-3 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-high">
                {filtered.map((c) => (
                  <tr key={c.id} className="bg-white/50 hover:bg-surface-container-low/80">
                    <td className="px-4 py-3 font-medium text-on-background">
                      {c.firstName} {c.lastName}
                    </td>
                    <td className="px-4 py-3 text-secondary">
                      <div className="space-y-0.5">
                        {c.phone ? <p>{c.phone}</p> : null}
                        {c.email ? <p className="break-all">{c.email}</p> : null}
                        {!c.phone && !c.email ? <span className="text-secondary/70">—</span> : null}
                      </div>
                    </td>
                    <td className="max-w-[220px] px-4 py-3 text-secondary">
                      <span className="line-clamp-3 text-xs">{formatAddressOneLine(c.address)}</span>
                    </td>
                    <td className="px-4 py-3 text-secondary">
                      <div className="space-y-0.5 text-xs">
                        {c.orderSource ? <p>Kaynak: {c.orderSource}</p> : null}
                        {c.lastPaymentMethod ? (
                          <p>Son ödeme: {paymentMethodLabel(c.lastPaymentMethod, c.lastMealCardBrandId)}</p>
                        ) : null}
                        {!c.orderSource && !c.lastPaymentMethod ? (
                          <span className="text-secondary/70">—</span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => openEdit(c)}
                        className="mr-2 rounded-lg px-2 py-1 text-xs font-semibold text-primary hover:bg-primary/10"
                      >
                        Düzenle
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(c)}
                        className="rounded-lg px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                      >
                        Sil
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="space-y-3 lg:hidden">
            {filtered.map((c) => (
              <li
                key={c.id}
                className="rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-headline font-bold text-on-background">
                    {c.firstName} {c.lastName}
                  </p>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(c)}
                      className="rounded-lg p-1.5 text-primary hover:bg-primary/10"
                      aria-label="Düzenle"
                    >
                      <span className="material-symbols-outlined text-[20px]">edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(c)}
                      className="rounded-lg p-1.5 text-red-600 hover:bg-red-50"
                      aria-label="Sil"
                    >
                      <span className="material-symbols-outlined text-[20px]">delete</span>
                    </button>
                  </div>
                </div>
                {c.phone ? <p className="mt-2 text-sm text-secondary">{c.phone}</p> : null}
                {c.email ? <p className="mt-1 break-all text-sm text-secondary">{c.email}</p> : null}
                <p className="mt-2 text-sm text-secondary line-clamp-4">{formatAddressOneLine(c.address)}</p>
                {(c.orderSource || c.lastPaymentMethod) && (
                  <p className="mt-2 text-xs text-secondary">
                    {[
                      c.orderSource && `Kaynak: ${c.orderSource}`,
                      c.lastPaymentMethod &&
                        `Son ödeme: ${paymentMethodLabel(c.lastPaymentMethod, c.lastMealCardBrandId)}`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </>
      )}

      <CustomerFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        mode={modalMode}
        editingCustomer={editingCustomer}
        orderSource="panel_manual"
        onSave={handleSaveCustomer}
      />
    </div>
  );
}
