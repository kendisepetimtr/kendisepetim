"use client";

import {
  superadminBlockCustomer,
  superadminDeleteCustomer,
  superadminSaveCustomerNote,
  superadminUnblockCustomer,
} from "@/app/superadmin/actions";
import { formatTrPhoneDisplay } from "@/lib/phone-tr";
import { customerDisplayName, type SuperadminCustomer } from "@/lib/superadmin/customers-types";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

type Props = {
  initialCustomers: SuperadminCustomer[];
  loadError: string | null;
};

export default function SuperadminCustomersClient({ initialCustomers, loadError }: Props) {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "blocked">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>(() =>
    Object.fromEntries(initialCustomers.map((c) => [c.userId, c.adminNote])),
  );
  const [reasons, setReasons] = useState<Record<string, string>>(() =>
    Object.fromEntries(initialCustomers.map((c) => [c.userId, c.blockedReason])),
  );

  useEffect(() => {
    setNotes(Object.fromEntries(initialCustomers.map((c) => [c.userId, c.adminNote])));
    setReasons(Object.fromEntries(initialCustomers.map((c) => [c.userId, c.blockedReason])));
  }, [initialCustomers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("tr");
    return initialCustomers.filter((c) => {
      if (filter === "blocked" && !c.blockedAt) return false;
      if (filter === "active" && c.blockedAt) return false;
      if (!q) return true;
      const hay = `${c.firstName} ${c.lastName} ${c.email} ${c.phone}`.toLocaleLowerCase("tr");
      return hay.includes(q);
    });
  }, [initialCustomers, search, filter]);

  const blockedCount = initialCustomers.filter((c) => c.blockedAt).length;

  function run(p: Promise<{ error?: string }>) {
    startTransition(async () => {
      setErr(null);
      const r = await p;
      if (r.error) setErr(r.error);
      else router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-4xl px-3 py-6 sm:px-6 sm:py-8">
      <header className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h1 className="font-headline text-2xl font-extrabold tracking-tight sm:text-3xl">Müşteriler</h1>
          <p className="mt-1 text-sm text-secondary">
            {initialCustomers.length} kayıtlı müşteri
            {blockedCount > 0 ? ` · ${blockedCount} engelli` : ""}
          </p>
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Ad, e-posta veya telefon ara…"
          className="w-full rounded-xl border border-surface-container-highest bg-white px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 sm:max-w-sm"
        />
      </header>

      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            ["all", "Tümü"],
            ["active", "Aktif"],
            ["blocked", "Engelli"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={[
              "rounded-full px-3 py-1.5 text-xs font-bold",
              filter === id ? "bg-primary text-white" : "bg-surface-container-high text-secondary",
            ].join(" ")}
          >
            {label}
          </button>
        ))}
      </div>

      {loadError ? (
        <p className="mb-4 rounded-xl border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">{loadError}</p>
      ) : null}
      {err ? (
        <p className="mb-4 rounded-xl border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">{err}</p>
      ) : null}

      {filtered.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-surface-container-highest py-16 text-center text-secondary">
          {search || filter !== "all" ? "Sonuç yok." : "Henüz kayıtlı müşteri yok."}
        </p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((c) => {
            const expanded = expandedId === c.userId;
            const blocked = Boolean(c.blockedAt);
            return (
              <li
                key={c.userId}
                className="overflow-hidden rounded-2xl border border-surface-container-highest bg-surface-container-lowest shadow-sm"
              >
                <button
                  type="button"
                  onClick={() => setExpandedId((cur) => (cur === c.userId ? null : c.userId))}
                  className="flex w-full items-start justify-between gap-3 px-4 py-4 text-left sm:px-5"
                >
                  <div className="min-w-0">
                    <p className="font-headline text-base font-bold text-on-background">{customerDisplayName(c)}</p>
                    <p className="mt-0.5 truncate text-xs text-secondary">
                      {c.email || "E-posta yok"}
                      {c.phone ? ` · ${formatTrPhoneDisplay(c.phone)}` : ""}
                    </p>
                    <p className="mt-1 text-[11px] text-secondary">
                      {c.orderCount} sipariş · {c.addressCount} adres
                      {c.createdAt
                        ? ` · ${new Date(c.createdAt).toLocaleDateString("tr-TR")}`
                        : ""}
                    </p>
                  </div>
                  <span
                    className={[
                      "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                      blocked ? "bg-error/15 text-error" : "bg-emerald-500/15 text-emerald-900",
                    ].join(" ")}
                  >
                    {blocked ? "Engelli" : "Aktif"}
                  </span>
                </button>

                {expanded ? (
                  <div className="space-y-4 border-t border-surface-container-highest px-4 py-4 sm:px-5">
                    <div className="flex items-center justify-between gap-3 rounded-xl bg-surface-container-low px-3 py-3">
                      <div>
                        <p className="text-sm font-semibold">Hesabı engelle</p>
                        <p className="text-xs text-secondary">
                          Engellenen müşteri giriş yapamaz ve sipariş veremez.
                        </p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={blocked}
                        disabled={pending}
                        onClick={() => {
                          if (blocked) {
                            run(superadminUnblockCustomer(c.userId));
                            return;
                          }
                          run(superadminBlockCustomer(c.userId, reasons[c.userId] ?? ""));
                        }}
                        className={[
                          "relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50",
                          blocked ? "bg-error" : "bg-surface-container-highest",
                        ].join(" ")}
                      >
                        <span
                          className={[
                            "absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform",
                            blocked ? "translate-x-5" : "translate-x-0",
                          ].join(" ")}
                        />
                      </button>
                    </div>

                    <label className="block space-y-1.5">
                      <span className="text-[11px] font-bold uppercase tracking-wide text-secondary">
                        Engel gerekçesi
                      </span>
                      <input
                        value={reasons[c.userId] ?? ""}
                        onChange={(e) => setReasons((p) => ({ ...p, [c.userId]: e.target.value }))}
                        placeholder="Örn. sahte sipariş, hakaret…"
                        className="w-full rounded-xl border border-surface-container-highest bg-white px-3 py-2.5 text-sm"
                      />
                    </label>

                    <label className="block space-y-1.5">
                      <span className="text-[11px] font-bold uppercase tracking-wide text-secondary">İç not</span>
                      <textarea
                        value={notes[c.userId] ?? ""}
                        onChange={(e) => setNotes((p) => ({ ...p, [c.userId]: e.target.value }))}
                        rows={3}
                        className="w-full rounded-xl border border-surface-container-highest bg-white px-3 py-2.5 text-sm"
                        placeholder="Yalnızca süperadmin görür."
                      />
                    </label>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => run(superadminSaveCustomerNote(c.userId, notes[c.userId] ?? ""))}
                        className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
                      >
                        Notu kaydet
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => {
                          if (
                            !window.confirm(
                              `${customerDisplayName(c)} silinsin mi? Profil ve adresler gider; sipariş kayıtları restoranda kalır.`,
                            )
                          ) {
                            return;
                          }
                          run(superadminDeleteCustomer(c.userId));
                        }}
                        className="rounded-xl border border-error/30 px-4 py-2.5 text-sm font-bold text-error disabled:opacity-60"
                      >
                        Müşteriyi sil
                      </button>
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
