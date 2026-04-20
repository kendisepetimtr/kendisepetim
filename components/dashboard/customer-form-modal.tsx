"use client";

import CustomerIdentityAddressForm from "@/components/customer/customer-identity-address-form";
import {
  emptyCustomerFormValues,
  type CustomerFormValues,
  validateCustomerFormRequired,
} from "@/lib/customer-address";
import { buildCustomerFromForm, customerToFormValues, type LocalCustomer } from "@/lib/local-customers";
import { type FormEvent, useEffect, useId, useState } from "react";

type CustomerFormModalProps = {
  open: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  editingCustomer: LocalCustomer | null;
  /** Panel kayıtları için sabit */
  orderSource: string;
  onSave: (customer: LocalCustomer) => void;
};

export default function CustomerFormModal({
  open,
  onClose,
  mode,
  editingCustomer,
  orderSource,
  onSave,
}: CustomerFormModalProps) {
  const baseId = useId();
  const [values, setValues] = useState<CustomerFormValues>(emptyCustomerFormValues);

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && editingCustomer) {
      setValues(customerToFormValues(editingCustomer));
    } else {
      setValues(emptyCustomerFormValues());
    }
  }, [open, mode, editingCustomer]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const err = validateCustomerFormRequired(values);
    if (err) {
      window.alert(err);
      return;
    }
    if (mode === "edit" && editingCustomer) {
      const now = new Date().toISOString();
      const next: LocalCustomer = {
        ...editingCustomer,
        firstName: values.firstName.trim() || "—",
        lastName: values.lastName.trim(),
        phone: values.phone.trim(),
        email: values.email.trim(),
        address: {
          neighborhood: values.neighborhood.trim(),
          street: values.street.trim(),
          buildingNo: values.buildingNo.trim(),
          buildingName: values.buildingName.trim(),
          floor: values.floor.trim(),
          apartmentNo: values.apartmentNo.trim(),
          livesInSite: values.livesInSite,
          siteName: values.siteName.trim(),
          block: values.block.trim(),
        },
        orderSource,
        updatedAt: now,
      };
      onSave(next);
    } else {
      onSave(buildCustomerFromForm(values, orderSource));
    }
    onClose();
  }

  if (!open) return null;

  const title = mode === "edit" ? "Müşteriyi düzenle" : "Yeni müşteri";

  return (
    <div className="fixed inset-0 z-[175] flex items-end justify-center p-4 sm:items-center sm:p-6" role="presentation">
      <button
        type="button"
        aria-label="Kapat"
        className="absolute inset-0 bg-on-background/50 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${baseId}-title`}
        className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-surface-container-highest bg-surface-container-lowest shadow-2xl"
      >
        <div className="border-b border-surface-container-high px-5 py-4">
          <h2 id={`${baseId}-title`} className="font-headline text-lg font-bold text-on-background">
            {title}
          </h2>
          <p className="mt-1 text-xs text-secondary">
            Sipariş kaynağı bu ekranda değiştirilmez; sistem atar ({orderSource}).
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="max-h-[min(65vh,560px)] overflow-y-auto px-5 py-4">
            <CustomerIdentityAddressForm idPrefix={`${baseId}-panel`} values={values} onChange={setValues} />
          </div>

          <div className="flex gap-2 border-t border-surface-container-high bg-surface-container-low/50 px-5 py-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-surface-container-highest bg-white py-3 text-sm font-semibold text-on-background hover:bg-surface-container-low"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              className="flex-1 rounded-xl bg-primary py-3 text-sm font-bold text-white hover:bg-primary-container"
            >
              {mode === "edit" ? "Kaydet" : "Ekle"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
