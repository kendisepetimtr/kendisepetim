"use client";

import {
  emptyCustomerAddress,
  formatAddressOneLine,
  addressHasCoordinates,
  type CustomerAddress,
} from "@/lib/customer-address";
import CustomerAddressMap from "@/components/customer/customer-address-map";
import type { ResolvedAddress } from "@/lib/geocoding/client";
import { asGeoPoint, type GeoPoint } from "@/lib/geo";
import {
  deleteGuestAddress,
  getGuestCustomer,
  upsertGuestAddress,
  type GuestSavedAddress,
} from "@/lib/guest-customer";
import {
  deleteCustomerAddressAction,
  saveCustomerAddressAction,
} from "@/app/musteri/actions";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

type Saved = {
  id: string;
  label: string;
  address: CustomerAddress;
  isDefault: boolean;
};

type Props = {
  isCustomer: boolean;
  initialAddresses: Saved[];
};

export default function MusteriAddresses({ isCustomer, initialAddresses }: Props) {
  const [guestRows, setGuestRows] = useState<GuestSavedAddress[]>([]);
  const [editing, setEditing] = useState<Saved | null>(null);
  const [creating, setCreating] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!isCustomer) setGuestRows(getGuestCustomer().addresses);
  }, [isCustomer]);

  const rows: Saved[] = isCustomer ? initialAddresses : guestRows;

  function refreshGuest() {
    setGuestRows(getGuestCustomer().addresses);
  }

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="font-headline text-2xl font-extrabold tracking-tight">Adreslerim</h1>
          <p className="mt-1 text-sm text-secondary">
            {isCustomer
              ? "Kayıtlı teslimat adresleriniz. Konum eklerseniz siparişte tekrar sormayız."
              : "Bu cihaza kaydedilir. Hesap açınca diğer cihazlara da taşınabilir."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setCreating(true);
            setEditing(null);
            setError(null);
          }}
          className="shrink-0 rounded-xl bg-primary px-3 py-2 text-sm font-bold text-white"
        >
          Adres ekle
        </button>
      </div>

      {creating || editing ? (
        <AddressEditor
          initial={
            editing ?? {
              id: "",
              label: "Ev",
              address: emptyCustomerAddress(),
              isDefault: rows.length === 0,
            }
          }
          pending={pending}
          error={error}
          onCancel={() => {
            setCreating(false);
            setEditing(null);
            setError(null);
          }}
          onSave={(next) => {
            setError(null);
            if (!isCustomer) {
              upsertGuestAddress({
                id: next.id || undefined,
                label: next.label,
                address: next.address,
                isDefault: next.isDefault,
              });
              refreshGuest();
              setCreating(false);
              setEditing(null);
              return;
            }
            startTransition(async () => {
              const res = await saveCustomerAddressAction({
                id: next.id || undefined,
                label: next.label,
                address: next.address,
                isDefault: next.isDefault,
              });
              if (!res.ok) {
                setError(res.error);
                return;
              }
              setCreating(false);
              setEditing(null);
              router.refresh();
            });
          }}
        />
      ) : null}

      {rows.length === 0 && !creating ? (
        <div className="rounded-2xl border border-dashed border-surface-container-highest px-6 py-14 text-center">
          <p className="font-headline text-lg font-bold">Kayıtlı adres yok</p>
          <p className="mt-2 text-sm text-secondary">İlk teslimat adresinizi ekleyin.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li
              key={row.id}
              className="rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-headline text-base font-bold">
                    {row.label}
                    {row.isDefault ? (
                      <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                        Varsayılan
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-1 text-sm text-secondary">{formatAddressOneLine(row.address)}</p>
                  {addressHasCoordinates(row.address) ? (
                    <p className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-primary">
                      <span className="material-symbols-outlined text-[14px]">my_location</span>
                      Konum kayıtlı
                    </p>
                  ) : (
                    <p className="mt-1.5 text-[11px] text-secondary">Konum yok — siparişte istenebilir</p>
                  )}
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    className="text-xs font-bold text-primary"
                    onClick={() => {
                      setEditing(row);
                      setCreating(false);
                    }}
                  >
                    Düzenle
                  </button>
                  <button
                    type="button"
                    className="text-xs font-bold text-error"
                    onClick={() => {
                      if (!isCustomer) {
                        deleteGuestAddress(row.id);
                        refreshGuest();
                        return;
                      }
                      startTransition(async () => {
                        await deleteCustomerAddressAction(row.id);
                        router.refresh();
                      });
                    }}
                  >
                    Sil
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AddressEditor({
  initial,
  pending,
  error,
  onCancel,
  onSave,
}: {
  initial: Saved;
  pending: boolean;
  error: string | null;
  onCancel: () => void;
  onSave: (next: Saved) => void;
}) {
  const [label, setLabel] = useState(initial.label);
  const [address, setAddress] = useState(initial.address);
  const [isDefault, setIsDefault] = useState(initial.isDefault);

  function setField<K extends keyof CustomerAddress>(key: K, value: CustomerAddress[K]) {
    setAddress((prev) => ({ ...prev, [key]: value }));
  }

  const savedPoint = asGeoPoint(address.latitude, address.longitude);

  function handleLocationChange(point: GeoPoint | null) {
    setAddress((prev) => ({
      ...prev,
      latitude: point?.lat ?? null,
      longitude: point?.lng ?? null,
    }));
  }

  /** Mahalle pinden yazılır; sokak yalnızca doluysa — sağlayıcı sık sık boş döndürüyor. */
  function handleAddressResolved(resolved: ResolvedAddress | null) {
    if (!resolved) return;
    setAddress((prev) => ({
      ...prev,
      neighborhood: resolved.neighborhood || prev.neighborhood,
      street: resolved.street || prev.street,
    }));
  }

  return (
    <form
      className="mb-6 space-y-3 rounded-2xl border border-surface-container-highest bg-white p-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ id: initial.id, label, address, isDefault });
      }}
    >
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Etiket (Ev, İş…)"
        className="w-full rounded-xl border border-surface-container-highest px-3 py-2.5 text-sm"
        required
      />
      <CustomerAddressMap
        point={savedPoint}
        onPointChange={handleLocationChange}
        onAddressResolved={handleAddressResolved}
        title="Adres konumu"
        description="Bir kez işaretleyin — bu adresle verdiğiniz siparişlerde tekrar sorulmaz. Mahalle buradan belirlenir."
      />
      <div>
        <input
          value={address.neighborhood}
          readOnly
          aria-readonly
          placeholder="Mahalle — haritadan konum seçin"
          className="w-full cursor-not-allowed rounded-xl border border-surface-container-highest bg-surface-container-low px-3 py-2.5 text-sm font-medium"
          required
        />
        <p className="mt-1 text-[11px] text-secondary">
          Haritadaki pine göre otomatik dolar; değiştirmek için pini taşıyın.
        </p>
      </div>
      <div>
        <input
          value={address.street}
          onChange={(e) => setField("street", e.target.value)}
          placeholder="Sokak / cadde"
          className="w-full rounded-xl border border-surface-container-highest px-3 py-2.5 text-sm"
          required
        />
        <p className="mt-1 text-[11px] text-secondary">
          Haritadan otomatik gelir. Boş kaldıysa veya yanlışsa düzeltebilirsiniz.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input
          value={address.buildingNo}
          onChange={(e) => setField("buildingNo", e.target.value)}
          placeholder="Apartman no"
          className="rounded-xl border border-surface-container-highest px-3 py-2.5 text-sm"
          required
        />
        <input
          value={address.buildingName}
          onChange={(e) => setField("buildingName", e.target.value)}
          placeholder="Apartman adı"
          className="rounded-xl border border-surface-container-highest px-3 py-2.5 text-sm"
          required
        />
        <input
          value={address.floor}
          onChange={(e) => setField("floor", e.target.value)}
          placeholder="Kat"
          className="rounded-xl border border-surface-container-highest px-3 py-2.5 text-sm"
          required
        />
        <input
          value={address.apartmentNo}
          onChange={(e) => setField("apartmentNo", e.target.value)}
          placeholder="Daire"
          className="rounded-xl border border-surface-container-highest px-3 py-2.5 text-sm"
          required
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={address.livesInSite}
          onChange={(e) => setField("livesInSite", e.target.checked)}
        />
        Sitede oturuyorum
      </label>
      {address.livesInSite ? (
        <div className="grid grid-cols-2 gap-2">
          <input
            value={address.siteName}
            onChange={(e) => setField("siteName", e.target.value)}
            placeholder="Site adı"
            className="rounded-xl border border-surface-container-highest px-3 py-2.5 text-sm"
            required
          />
          <input
            value={address.block}
            onChange={(e) => setField("block", e.target.value)}
            placeholder="Blok"
            className="rounded-xl border border-surface-container-highest px-3 py-2.5 text-sm"
            required
          />
        </div>
      ) : null}
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} />
        Varsayılan adres
      </label>
      {error ? (
        <p className="rounded-lg border border-error/30 bg-error/5 px-3 py-2 text-sm text-error">{error}</p>
      ) : null}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
        >
          {pending ? "Kaydediliyor…" : "Kaydet"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-surface-container-highest px-4 py-2.5 text-sm font-bold"
        >
          Vazgeç
        </button>
      </div>
    </form>
  );
}
