"use client";

import {
  superadminLogoutAction,
  superadminSetMarketplace,
  superadminSetDashboard,
  superadminSetOwnerAdminPin,
  superadminSetPlan,
  superadminSetPublicMenu,
  superadminUpdateSubdomain,
} from "@/app/superadmin/actions";
import type { TenantPlan, TenantRow } from "@/lib/supabase/tenant-types";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

type Props = {
  initialTenants: TenantRow[];
  loadError: string | null;
};

export default function SuperadminDashboard({ initialTenants, loadError }: Props) {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [subInputs, setSubInputs] = useState<Record<string, string>>(() =>
    Object.fromEntries(initialTenants.map((t) => [t.id, t.subdomain])),
  );
  const [pinInputs, setPinInputs] = useState<Record<string, string>>({});

  useEffect(() => {
    setSubInputs(Object.fromEntries(initialTenants.map((t) => [t.id, t.subdomain])));
    setPinInputs({});
  }, [initialTenants]);

  function run(p: Promise<{ error?: string }>) {
    startTransition(async () => {
      setErr(null);
      const r = await p;
      if (r.error) setErr(r.error);
      else router.refresh();
    });
  }

  const freeCount = initialTenants.filter((t) => t.plan === "free").length;
  const premCount = initialTenants.filter((t) => t.plan === "premium").length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8 flex flex-col gap-4 border-b border-surface-container-highest pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-primary">KendiSepetim</p>
          <h1 className="font-headline text-2xl font-extrabold tracking-tight sm:text-3xl">Süperadmin</h1>
          <p className="mt-1 text-sm text-secondary">İşletmeler, subdomain ve erişim bayrakları</p>
        </div>
        <form action={superadminLogoutAction}>
          <button
            type="submit"
            className="rounded-xl border border-surface-container-highest bg-surface-container-low px-4 py-2.5 text-sm font-semibold text-on-background transition-colors hover:bg-surface-container"
          >
            Çıkış
          </button>
        </form>
      </header>

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-secondary">Toplam işletme</p>
          <p className="mt-1 font-headline text-2xl font-extrabold">{initialTenants.length}</p>
        </div>
        <div className="rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-secondary">Free</p>
          <p className="mt-1 font-headline text-2xl font-extrabold">{freeCount}</p>
        </div>
        <div className="rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-secondary">Premium</p>
          <p className="mt-1 font-headline text-2xl font-extrabold">{premCount}</p>
        </div>
      </div>

      {loadError ? (
        <p className="mb-6 rounded-xl border border-error/30 bg-error/5 px-4 py-3 text-sm text-error" role="alert">
          Veri yüklenemedi: {loadError}
        </p>
      ) : null}

      {err ? (
        <p className="mb-6 rounded-xl border border-error/30 bg-error/5 px-4 py-3 text-sm text-error" role="alert">
          {err}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-surface-container-highest bg-surface-container-lowest shadow-sm">
        <table className="w-full min-w-[1200px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-surface-container-highest bg-surface-container-low text-xs font-bold uppercase tracking-wide text-secondary">
              <th className="px-4 py-3">İşletme</th>
              <th className="px-4 py-3">Subdomain</th>
              <th className="px-4 py-3">Sahip</th>
              <th className="px-4 py-3">Patron PIN</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">QR menü</th>
              <th className="px-4 py-3">Marketplace</th>
              <th className="px-4 py-3">Panel</th>
              <th className="px-4 py-3">Kayıt</th>
            </tr>
          </thead>
          <tbody>
            {initialTenants.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-secondary">
                  Henüz kayıtlı işletme yok.
                </td>
              </tr>
            ) : (
              initialTenants.map((t) => (
                <tr key={t.id} className="border-b border-surface-container-high/80 last:border-0">
                  <td className="px-4 py-3 align-top font-medium text-on-background">{t.business_name}</td>
                  <td className="px-4 py-3 align-top">
                    <div className="flex max-w-[200px] flex-col gap-2 sm:max-w-[220px]">
                      <input
                        value={subInputs[t.id] ?? t.subdomain}
                        disabled={pending}
                        onChange={(e) =>
                          setSubInputs((s) => ({ ...s, [t.id]: e.target.value.toLowerCase() }))
                        }
                        className="w-full rounded-lg border border-surface-container-highest bg-white px-2 py-1.5 font-mono text-xs text-on-background outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                        spellCheck={false}
                      />
                      <button
                        type="button"
                        disabled={pending || (subInputs[t.id] ?? t.subdomain) === t.subdomain}
                        onClick={() =>
                          run(superadminUpdateSubdomain(t.id, subInputs[t.id] ?? t.subdomain))
                        }
                        className="rounded-lg bg-primary/10 px-2 py-1 text-xs font-bold text-primary hover:bg-primary/15 disabled:opacity-40"
                      >
                        Subdomain kaydet
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top text-secondary">
                    <div className="max-w-[200px] space-y-0.5">
                      <p className="font-medium text-on-background">{t.owner_name}</p>
                      <p className="break-all text-xs">{t.email}</p>
                      <p className="text-xs">{t.phone || "—"}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="flex max-w-[180px] flex-col gap-2">
                      <input
                        value={pinInputs[t.id] ?? ""}
                        disabled={pending}
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={4}
                        placeholder="1234"
                        onChange={(e) =>
                          setPinInputs((s) => ({
                            ...s,
                            [t.id]: e.target.value.replace(/\D/g, "").slice(0, 4),
                          }))
                        }
                        className="w-full rounded-lg border border-surface-container-highest bg-white px-2 py-1.5 font-mono text-xs text-on-background outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                      />
                      <button
                        type="button"
                        disabled={pending || (pinInputs[t.id] ?? "").length !== 4}
                        onClick={() => run(superadminSetOwnerAdminPin(t.id, pinInputs[t.id] ?? ""))}
                        className="rounded-lg bg-primary/10 px-2 py-1 text-xs font-bold text-primary hover:bg-primary/15 disabled:opacity-40"
                      >
                        {t.owner_admin_pin_set_at ? "PIN sıfırla" : "PIN oluştur"}
                      </button>
                      <p className="text-[11px] text-secondary">
                        {t.owner_admin_pin_set_at
                          ? `Aktif: ${new Date(t.owner_admin_pin_set_at).toLocaleDateString("tr-TR")}`
                          : "Henüz tanımlanmadı"}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <select
                      value={t.plan}
                      disabled={pending}
                      onChange={(e) => run(superadminSetPlan(t.id, e.target.value as TenantPlan))}
                      className="rounded-lg border border-surface-container-highest bg-white px-2 py-1.5 text-xs font-semibold outline-none focus:border-primary"
                    >
                      <option value="free">Free</option>
                      <option value="premium">Premium</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => run(superadminSetPublicMenu(t.id, !t.public_menu_enabled))}
                      className={[
                        "rounded-full px-3 py-1 text-xs font-bold transition-colors",
                        t.public_menu_enabled
                          ? "bg-emerald-600/15 text-emerald-900"
                          : "bg-surface-container-high text-secondary",
                      ].join(" ")}
                    >
                      {t.public_menu_enabled ? "Açık" : "Kapalı"}
                    </button>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => run(superadminSetMarketplace(t.id, !t.marketplace_enabled))}
                      className={[
                        "rounded-full px-3 py-1 text-xs font-bold transition-colors",
                        t.marketplace_enabled
                          ? "bg-emerald-600/15 text-emerald-900"
                          : "bg-surface-container-high text-secondary",
                      ].join(" ")}
                    >
                      {t.marketplace_enabled ? "Açık" : "Kapalı"}
                    </button>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => run(superadminSetDashboard(t.id, !t.dashboard_enabled))}
                      className={[
                        "rounded-full px-3 py-1 text-xs font-bold transition-colors",
                        t.dashboard_enabled
                          ? "bg-emerald-600/15 text-emerald-900"
                          : "bg-surface-container-high text-secondary",
                      ].join(" ")}
                    >
                      {t.dashboard_enabled ? "Açık" : "Kapalı"}
                    </button>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 align-top text-xs text-secondary">
                    {new Date(t.created_at).toLocaleString("tr-TR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
