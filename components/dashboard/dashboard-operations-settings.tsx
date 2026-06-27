"use client";

import type { OperationsSettingsState } from "@/lib/dashboard/operations-settings";
import type { CourierRow } from "@/lib/supabase/courier-types";
import { courierDisplayName } from "@/lib/supabase/courier-types";
import type { StaffPinRole } from "@/lib/staff/pin";
import { type FormEvent, useCallback, useEffect, useId, useState, useTransition } from "react";

const PIN_ROLES: { id: StaffPinRole; label: string; hint: string }[] = [
  { id: "admin", label: "Admin PIN", hint: "Patron paneli (/admin)" },
  { id: "waiter", label: "Garson PIN", hint: "Garson paneli (/garson)" },
  { id: "cashier", label: "Kasa PIN", hint: "Kasa modu (/kasa)" },
];

type DashboardOperationsSettingsProps = {
  enabled: boolean;
};

export default function DashboardOperationsSettings({ enabled }: DashboardOperationsSettingsProps) {
  const baseId = useId();
  const [settings, setSettings] = useState<OperationsSettingsState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tableCount, setTableCount] = useState(0);
  const [dineInEnabled, setDineInEnabled] = useState(false);
  const [couriers, setCouriers] = useState<CourierRow[]>([]);
  const [savedFlash, setSavedFlash] = useState(false);
  const [pending, startTransition] = useTransition();

  const [pinRole, setPinRole] = useState<StaffPinRole>("waiter");
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  const [courierFirstName, setCourierFirstName] = useState("");
  const [courierLastName, setCourierLastName] = useState("");
  const [courierPhone, setCourierPhone] = useState("");
  const [editingCourierId, setEditingCourierId] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    if (!enabled) return;
    setLoadError(null);
    try {
      const res = await fetch("/api/dashboard/operations", { credentials: "include", cache: "no-store" });
      const data = (await res.json()) as { ok?: boolean; settings?: OperationsSettingsState; error?: string };
      if (!res.ok || !data.ok || !data.settings) {
        setLoadError(data.error ?? "Operasyon ayarları yüklenemedi.");
        return;
      }
      setSettings(data.settings);
      setTableCount(data.settings.tableCount);
      setDineInEnabled(data.settings.dineInEnabled);
      setCouriers(data.settings.couriers);
    } catch {
      setLoadError("Operasyon ayarları yüklenemedi.");
    }
  }, [enabled]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  function handleSaveOperations(e: FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await fetch("/api/dashboard/operations", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "settings",
          patch: { tableCount, dineInEnabled },
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        window.alert(data.error ?? "Kaydedilemedi.");
        return;
      }
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 2500);
      await loadSettings();
    });
  }

  function handleSavePin(e: FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await fetch("/api/dashboard/operations", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "pin",
          patch: { role: pinRole, currentPin, newPin, confirmPin },
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        window.alert(data.error ?? "PIN güncellenemedi.");
        return;
      }
      setCurrentPin("");
      setNewPin("");
      setConfirmPin("");
      window.alert("PIN kaydedildi.");
      await loadSettings();
    });
  }

  function resetCourierForm() {
    setEditingCourierId(null);
    setCourierFirstName("");
    setCourierLastName("");
    setCourierPhone("");
  }

  function handleEditCourier(courier: CourierRow) {
    setEditingCourierId(courier.id);
    setCourierFirstName(courier.first_name);
    setCourierLastName(courier.last_name);
    setCourierPhone(courier.phone);
  }

  function handleSaveCourier(e: FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await fetch("/api/dashboard/operations", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "courier-upsert",
          courier: {
            id: editingCourierId ?? undefined,
            firstName: courierFirstName,
            lastName: courierLastName,
            phone: courierPhone,
            isActive: true,
          },
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        window.alert(data.error ?? "Kurye kaydedilemedi.");
        return;
      }
      resetCourierForm();
      await loadSettings();
    });
  }

  function handleDeleteCourier(courierId: string) {
    if (!window.confirm("Bu kuryeyi silmek istediğinize emin misiniz?")) return;
    startTransition(async () => {
      const res = await fetch("/api/dashboard/operations", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "courier-delete", courierId }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        window.alert(data.error ?? "Kurye silinemedi.");
        return;
      }
      await loadSettings();
    });
  }

  function handleToggleCourierActive(courier: CourierRow) {
    startTransition(async () => {
      const res = await fetch("/api/dashboard/operations", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "courier-upsert",
          courier: {
            id: courier.id,
            firstName: courier.first_name,
            lastName: courier.last_name,
            phone: courier.phone,
            isActive: !courier.is_active,
          },
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        window.alert(data.error ?? "Güncellenemedi.");
        return;
      }
      await loadSettings();
    });
  }

  if (!enabled) return null;

  const pinFlags: Record<StaffPinRole, boolean> = {
    admin: settings?.hasAdminPin ?? false,
    waiter: settings?.hasWaiterPin ?? false,
    cashier: settings?.hasCashierPin ?? false,
  };

  return (
    <div className="mt-8 space-y-6">
      {loadError ? (
        <p className="rounded-xl border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">{loadError}</p>
      ) : null}

      <form
        onSubmit={handleSaveOperations}
        className="rounded-2xl border border-surface-container-high bg-surface-container-low/50 p-5 sm:p-6"
      >
        <h3 className="font-headline text-base font-bold text-on-background">Salon ve masa siparişi</h3>
        <p className="mt-1 text-xs leading-relaxed text-secondary">
          Garson ve kasa panellerindeki masa grid&apos;i bu sayıya göre oluşturulur. Masa QR menüsü için dine-in
          açık olmalıdır.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-secondary" htmlFor={`${baseId}-table-count`}>
              Masa sayısı
            </label>
            <input
              id={`${baseId}-table-count`}
              type="number"
              min={0}
              max={200}
              value={tableCount}
              onChange={(e) => setTableCount(Number(e.target.value))}
              className="mt-1 w-full rounded-xl border border-surface-container-highest bg-white px-3 py-2.5 text-sm"
            />
          </div>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-transparent p-2 sm:mt-6">
            <input
              type="checkbox"
              checked={dineInEnabled}
              onChange={(e) => setDineInEnabled(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-surface-container-highest text-primary"
            />
            <span>
              <span className="block text-sm font-medium text-on-background">Masa siparişi aktif</span>
              <span className="mt-0.5 block text-xs text-secondary">
                `/masa/N` menüsü ve masa QR kodları kullanılabilir.
              </span>
            </span>
          </label>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary disabled:opacity-60"
          >
            {pending ? "Kaydediliyor…" : "Salon ayarlarını kaydet"}
          </button>
          {savedFlash ? <span className="text-sm font-medium text-primary">Kaydedildi</span> : null}
        </div>
      </form>

      <form
        onSubmit={handleSavePin}
        className="rounded-2xl border border-surface-container-high bg-surface-container-low/50 p-5 sm:p-6"
      >
        <h3 className="font-headline text-base font-bold text-on-background">Personel PIN&apos;leri</h3>
        <p className="mt-1 text-xs leading-relaxed text-secondary">
          Garson, kasa ve admin panelleri 4 haneli PIN ile korunur. İlk kez tanımlarken mevcut PIN gerekmez.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {PIN_ROLES.map((role) => (
            <button
              key={role.id}
              type="button"
              onClick={() => setPinRole(role.id)}
              className={[
                "rounded-full px-3 py-1.5 text-xs font-semibold",
                pinRole === role.id
                  ? "bg-primary text-on-primary"
                  : "border border-surface-container-highest bg-white text-secondary",
              ].join(" ")}
            >
              {role.label}
              {pinFlags[role.id] ? " ✓" : ""}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-secondary">{PIN_ROLES.find((r) => r.id === pinRole)?.hint}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {pinFlags[pinRole] ? (
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              placeholder="Mevcut PIN"
              value={currentPin}
              onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              className="rounded-xl border border-surface-container-highest bg-white px-3 py-2.5 text-sm"
            />
          ) : null}
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            placeholder="Yeni PIN"
            value={newPin}
            onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            className="rounded-xl border border-surface-container-highest bg-white px-3 py-2.5 text-sm"
          />
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            placeholder="Yeni PIN tekrar"
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            className="rounded-xl border border-surface-container-highest bg-white px-3 py-2.5 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="mt-4 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2.5 text-sm font-semibold text-primary disabled:opacity-60"
        >
          PIN kaydet
        </button>
      </form>

      <div className="rounded-2xl border border-surface-container-high bg-surface-container-low/50 p-5 sm:p-6">
        <h3 className="font-headline text-base font-bold text-on-background">Kuryeler</h3>
        <p className="mt-1 text-xs leading-relaxed text-secondary">
          Paket siparişlerde teslimat ataması için kurye listesi. Kasa panelinde seçilecektir.
        </p>

        {couriers.length > 0 ? (
          <ul className="mt-4 space-y-2">
            {couriers.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-surface-container-highest bg-white px-3 py-2.5"
              >
                <div>
                  <p className="text-sm font-semibold text-on-background">{courierDisplayName(c)}</p>
                  <p className="text-xs text-secondary">{c.phone || "Telefon yok"} · {c.is_active ? "Aktif" : "Pasif"}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleEditCourier(c)}
                    className="rounded-lg px-2 py-1 text-xs font-semibold text-primary hover:bg-primary/10"
                  >
                    Düzenle
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleCourierActive(c)}
                    disabled={pending}
                    className="rounded-lg px-2 py-1 text-xs font-semibold text-secondary hover:bg-surface-container-low"
                  >
                    {c.is_active ? "Pasifleştir" : "Aktifleştir"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteCourier(c.id)}
                    disabled={pending}
                    className="rounded-lg px-2 py-1 text-xs font-semibold text-error hover:bg-error/5"
                  >
                    Sil
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-secondary">Henüz kurye eklenmedi.</p>
        )}

        <form onSubmit={handleSaveCourier} className="mt-4 grid gap-3 sm:grid-cols-3">
          <input
            value={courierFirstName}
            onChange={(e) => setCourierFirstName(e.target.value)}
            placeholder="Ad"
            required
            className="rounded-xl border border-surface-container-highest bg-white px-3 py-2.5 text-sm"
          />
          <input
            value={courierLastName}
            onChange={(e) => setCourierLastName(e.target.value)}
            placeholder="Soyad"
            required
            className="rounded-xl border border-surface-container-highest bg-white px-3 py-2.5 text-sm"
          />
          <input
            value={courierPhone}
            onChange={(e) => setCourierPhone(e.target.value)}
            placeholder="Telefon (opsiyonel)"
            className="rounded-xl border border-surface-container-highest bg-white px-3 py-2.5 text-sm"
          />
          <div className="flex flex-wrap gap-2 sm:col-span-3">
            <button
              type="submit"
              disabled={pending}
              className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary disabled:opacity-60"
            >
              {editingCourierId ? "Kuryeyi güncelle" : "Kurye ekle"}
            </button>
            {editingCourierId ? (
              <button
                type="button"
                onClick={resetCourierForm}
                className="rounded-xl border border-surface-container-highest px-4 py-2.5 text-sm font-semibold text-secondary"
              >
                İptal
              </button>
            ) : null}
          </div>
        </form>
      </div>
    </div>
  );
}
