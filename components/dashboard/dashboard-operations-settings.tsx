"use client";

import ReceiptSettingsPreview from "@/components/dashboard/receipt-settings-preview";
import type { OperationsSettingsState } from "@/lib/dashboard/operations-settings";
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  NOTIFICATION_SOUND_OPTIONS,
  type NotificationSoundId,
  type TenantNotificationSettings,
} from "@/lib/notification-settings";
import { playNotificationSound } from "@/lib/notification-sounds";
import { DEFAULT_RECEIPT_SETTINGS, type TenantReceiptSettings } from "@/lib/receipt-settings";
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

  const [notificationSettings, setNotificationSettings] = useState<TenantNotificationSettings>(
    DEFAULT_NOTIFICATION_SETTINGS,
  );
  const [receiptSettings, setReceiptSettings] = useState<TenantReceiptSettings>(DEFAULT_RECEIPT_SETTINGS);
  const [businessName, setBusinessName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [notifSavedFlash, setNotifSavedFlash] = useState(false);
  const [receiptSavedFlash, setReceiptSavedFlash] = useState(false);

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
      setNotificationSettings(data.settings.notificationSettings);
      setReceiptSettings(data.settings.receiptSettings);
      setBusinessName(data.settings.businessName);
      setSubdomain(data.settings.subdomain);
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

  function handleSaveNotification(e: FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await fetch("/api/dashboard/operations", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "notification-settings", patch: notificationSettings }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        window.alert(data.error ?? "Kaydedilemedi.");
        return;
      }
      setNotifSavedFlash(true);
      window.setTimeout(() => setNotifSavedFlash(false), 2500);
    });
  }

  function handleSaveReceipt(e: FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await fetch("/api/dashboard/operations", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "receipt-settings", patch: receiptSettings }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        window.alert(data.error ?? "Kaydedilemedi.");
        return;
      }
      setReceiptSavedFlash(true);
      window.setTimeout(() => setReceiptSavedFlash(false), 2500);
    });
  }

  function patchReceipt<K extends keyof TenantReceiptSettings>(key: K, value: TenantReceiptSettings[K]) {
    setReceiptSettings((prev) => ({ ...prev, [key]: value }));
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

      <form
        onSubmit={handleSaveNotification}
        className="rounded-2xl border border-surface-container-high bg-surface-container-low/50 p-5 sm:p-6"
      >
        <h3 className="font-headline text-base font-bold text-on-background">Bildirim ve zil sesi</h3>
        <p className="mt-1 text-xs leading-relaxed text-secondary">
          Dashboard, garson ve kasa panellerinde yeni sipariş veya hesap isteği geldiğinde ses ve toast bildirimi
          çalar.
        </p>

        <div className="mt-4 space-y-3">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={notificationSettings.soundEnabled}
              onChange={(e) =>
                setNotificationSettings((s) => ({ ...s, soundEnabled: e.target.checked }))
              }
              className="mt-0.5 h-4 w-4 rounded border-surface-container-highest text-primary"
            />
            <span className="text-sm text-on-background">Zil sesi açık</span>
          </label>
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={notificationSettings.toastEnabled}
              onChange={(e) =>
                setNotificationSettings((s) => ({ ...s, toastEnabled: e.target.checked }))
              }
              className="mt-0.5 h-4 w-4 rounded border-surface-container-highest text-primary"
            />
            <span className="text-sm text-on-background">Ekranda toast bildirimi</span>
          </label>
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={notificationSettings.alertOnOrderCreated}
              onChange={(e) =>
                setNotificationSettings((s) => ({ ...s, alertOnOrderCreated: e.target.checked }))
              }
              className="mt-0.5 h-4 w-4 rounded border-surface-container-highest text-primary"
            />
            <span className="text-sm text-on-background">Yeni siparişte uyar</span>
          </label>
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={notificationSettings.alertOnBillRequested}
              onChange={(e) =>
                setNotificationSettings((s) => ({ ...s, alertOnBillRequested: e.target.checked }))
              }
              className="mt-0.5 h-4 w-4 rounded border-surface-container-highest text-primary"
            />
            <span className="text-sm text-on-background">Hesap istendiğinde uyar</span>
          </label>
        </div>

        <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-secondary">Zil sesi seçimi</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {NOTIFICATION_SOUND_OPTIONS.map((opt) => (
            <label
              key={opt.id}
              className={[
                "flex cursor-pointer flex-col rounded-xl border p-3 transition-colors",
                notificationSettings.soundId === opt.id
                  ? "border-primary bg-primary/5"
                  : "border-surface-container-highest bg-white hover:border-primary/30",
              ].join(" ")}
            >
              <span className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`${baseId}-sound`}
                  checked={notificationSettings.soundId === opt.id}
                  onChange={() =>
                    setNotificationSettings((s) => ({ ...s, soundId: opt.id as NotificationSoundId }))
                  }
                  className="text-primary"
                />
                <span className="text-sm font-semibold text-on-background">{opt.label}</span>
              </span>
              <span className="mt-1 pl-6 text-xs text-secondary">{opt.description}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  void playNotificationSound(opt.id);
                }}
                className="mt-2 ml-6 w-fit rounded-lg px-2 py-1 text-xs font-semibold text-primary hover:bg-primary/10"
              >
                Dinle
              </button>
            </label>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary disabled:opacity-60"
          >
            {pending ? "Kaydediliyor…" : "Bildirim ayarlarını kaydet"}
          </button>
          {notifSavedFlash ? <span className="text-sm font-medium text-primary">Kaydedildi</span> : null}
        </div>
      </form>

      <form
        onSubmit={handleSaveReceipt}
        className="rounded-2xl border border-surface-container-high bg-surface-container-low/50 p-5 sm:p-6"
      >
        <h3 className="font-headline text-base font-bold text-on-background">Fiş ayarları</h3>
        <p className="mt-1 text-xs leading-relaxed text-secondary">
          Her siparişte müşteri, mutfak ve (paket siparişlerde) kurye fişi basılır. Yeni sipariş geldiğinde veya ödeme
          alındığında otomatik yazdırılabilir.
        </p>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="space-y-4">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={receiptSettings.enabled}
                onChange={(e) => patchReceipt("enabled", e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-surface-container-highest text-primary"
              />
              <span>
                <span className="block text-sm font-medium text-on-background">Fiş yazdırmayı etkinleştir</span>
              </span>
            </label>

            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={receiptSettings.autoPrintOnNewOrder}
                onChange={(e) => patchReceipt("autoPrintOnNewOrder", e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-surface-container-highest text-primary"
              />
              <span className="text-sm text-on-background">Yeni sipariş geldiğinde otomatik yazdır</span>
            </label>

            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={receiptSettings.autoPrintOnPayment}
                onChange={(e) => patchReceipt("autoPrintOnPayment", e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-surface-container-highest text-primary"
              />
              <span className="text-sm text-on-background">Ödeme alındığında otomatik yazdır</span>
            </label>

            <div>
              <label className="block text-xs font-medium text-secondary" htmlFor={`${baseId}-paper`}>
                Kağıt genişliği
              </label>
              <select
                id={`${baseId}-paper`}
                value={receiptSettings.paperWidthMm}
                onChange={(e) => patchReceipt("paperWidthMm", Number(e.target.value) as 58 | 80)}
                className="mt-1 w-full rounded-xl border border-surface-container-highest bg-white px-3 py-2 text-sm"
              >
                <option value={80}>80 mm (standart termal)</option>
                <option value={58}>58 mm (küçük termal)</option>
              </select>
              <p className="mt-1.5 text-[11px] leading-snug text-secondary">
                Yazıcı kâğıdıyla aynı genişliği seçin. Soluk çıkıyorsa Windows yazıcı
                özelliklerinde yoğunluğu (density) yükseltin; kenar boşluklarını
                &quot;Yok / Minimum&quot; yapın.
              </p>
            </div>

            <fieldset className="rounded-xl border border-surface-container-highest p-3">
              <legend className="px-1 text-xs font-semibold text-secondary">Fiş tipleri</legend>
              <div className="mt-2 space-y-2">
                <label className="flex items-center gap-2 text-sm text-on-background">
                  <input
                    type="checkbox"
                    checked={receiptSettings.customerReceiptEnabled}
                    onChange={(e) => patchReceipt("customerReceiptEnabled", e.target.checked)}
                    className="h-4 w-4 rounded border-surface-container-highest text-primary"
                  />
                  Müşteri fişi
                </label>
                <label className="flex items-center gap-2 text-sm text-on-background">
                  <input
                    type="checkbox"
                    checked={receiptSettings.kitchenReceiptEnabled}
                    onChange={(e) => patchReceipt("kitchenReceiptEnabled", e.target.checked)}
                    className="h-4 w-4 rounded border-surface-container-highest text-primary"
                  />
                  Mutfak fişi
                </label>
                <label className="flex items-center gap-2 text-sm text-on-background">
                  <input
                    type="checkbox"
                    checked={receiptSettings.courierReceiptEnabled}
                    onChange={(e) => patchReceipt("courierReceiptEnabled", e.target.checked)}
                    className="h-4 w-4 rounded border-surface-container-highest text-primary"
                  />
                  Kurye fişi (yalnızca paket)
                </label>
              </div>
            </fieldset>

            <div>
              <label className="block text-xs font-medium text-secondary" htmlFor={`${baseId}-copies`}>
                Müşteri fişi kopya sayısı
              </label>
              <input
                id={`${baseId}-copies`}
                type="number"
                min={1}
                max={3}
                value={receiptSettings.customerCopies}
                onChange={(e) => patchReceipt("customerCopies", Number(e.target.value))}
                className="mt-1 w-24 rounded-xl border border-surface-container-highest bg-white px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-secondary" htmlFor={`${baseId}-footer`}>
                Müşteri fişi alt metni
              </label>
              <textarea
                id={`${baseId}-footer`}
                value={receiptSettings.footerText}
                onChange={(e) => patchReceipt("footerText", e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-xl border border-surface-container-highest bg-white px-3 py-2 text-sm"
              />
            </div>

            <fieldset className="rounded-xl border border-surface-container-highest p-3">
              <legend className="px-1 text-xs font-semibold text-secondary">Müşteri fişi</legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {(
                  [
                    ["showLogo", "Logo"],
                    ["showBusinessName", "İşletme adı"],
                    ["showOrderCode", "Sipariş no"],
                    ["showDateTime", "Tarih / saat"],
                    ["showItemUnitPrices", "Kalem tutarları"],
                    ["showPaymentMethod", "Ödeme yöntemi"],
                    ["showMenuQr", "Menü QR kodu"],
                    ["showKendisepetimBranding", "kendisepetim.com satırı"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 text-sm text-on-background">
                    <input
                      type="checkbox"
                      checked={receiptSettings[key]}
                      onChange={(e) => patchReceipt(key, e.target.checked)}
                      className="h-4 w-4 rounded border-surface-container-highest text-primary"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="rounded-xl border border-surface-container-highest p-3">
              <legend className="px-1 text-xs font-semibold text-secondary">Mutfak fişi</legend>
              <div className="mt-2 grid gap-2">
                <label className="flex items-center gap-2 text-sm text-on-background">
                  <input
                    type="checkbox"
                    checked={receiptSettings.kitchenShowOrderMeta}
                    onChange={(e) => patchReceipt("kitchenShowOrderMeta", e.target.checked)}
                    className="h-4 w-4 rounded border-surface-container-highest text-primary"
                  />
                  Sipariş no ve saat
                </label>
                <label className="flex items-center gap-2 text-sm text-on-background">
                  <input
                    type="checkbox"
                    checked={receiptSettings.kitchenShowOrderNote}
                    onChange={(e) => patchReceipt("kitchenShowOrderNote", e.target.checked)}
                    className="h-4 w-4 rounded border-surface-container-highest text-primary"
                  />
                  Sipariş notu (mutfak)
                </label>
              </div>
            </fieldset>

            <fieldset className="rounded-xl border border-surface-container-highest p-3">
              <legend className="px-1 text-xs font-semibold text-secondary">Kurye fişi</legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {(
                  [
                    ["courierShowPrices", "Ürün fiyatları"],
                    ["courierShowPayment", "Ödeme şekli"],
                    ["courierShowCustomer", "Müşteri adı ve telefon"],
                    ["courierShowAddress", "Adres"],
                    ["courierShowLocationQr", "Konum QR (GPS)"],
                    ["courierShowOrderNote", "Kurye notu"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 text-sm text-on-background">
                    <input
                      type="checkbox"
                      checked={receiptSettings[key]}
                      onChange={(e) => patchReceipt(key, e.target.checked)}
                      className="h-4 w-4 rounded border-surface-container-highest text-primary"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>

          <ReceiptSettingsPreview businessName={businessName} subdomain={subdomain} settings={receiptSettings} />
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary disabled:opacity-60"
          >
            {pending ? "Kaydediliyor…" : "Fiş ayarlarını kaydet"}
          </button>
          {receiptSavedFlash ? <span className="text-sm font-medium text-primary">Kaydedildi</span> : null}
        </div>
      </form>
    </div>
  );
}
