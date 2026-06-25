export type CustomerAddress = {
  neighborhood: string;
  street: string;
  buildingNo: string;
  buildingName: string;
  floor: string;
  apartmentNo: string;
  livesInSite: boolean;
  siteName: string;
  block: string;
};

export function emptyCustomerAddress(): CustomerAddress {
  return {
    neighborhood: "",
    street: "",
    buildingNo: "",
    buildingName: "",
    floor: "",
    apartmentNo: "",
    livesInSite: false,
    siteName: "",
    block: "",
  };
}

export type CustomerFormValues = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  neighborhood: string;
  street: string;
  buildingNo: string;
  buildingName: string;
  floor: string;
  apartmentNo: string;
  livesInSite: boolean;
  siteName: string;
  block: string;
  orderNote: string;
};

export function emptyCustomerFormValues(): CustomerFormValues {
  return {
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    neighborhood: "",
    street: "",
    buildingNo: "",
    buildingName: "",
    floor: "",
    apartmentNo: "",
    livesInSite: false,
    siteName: "",
    block: "",
    orderNote: "",
  };
}

export function formValuesToAddress(v: CustomerFormValues): CustomerAddress {
  return {
    neighborhood: v.neighborhood.trim(),
    street: v.street.trim(),
    buildingNo: v.buildingNo.trim(),
    buildingName: v.buildingName.trim(),
    floor: v.floor.trim(),
    apartmentNo: v.apartmentNo.trim(),
    livesInSite: v.livesInSite,
    siteName: v.siteName.trim(),
    block: v.block.trim(),
  };
}

export function formatAddressOneLine(a: CustomerAddress): string {
  const parts = [
    a.neighborhood,
    a.street,
    a.buildingNo && `No: ${a.buildingNo}`,
    a.buildingName,
    a.floor && `Kat: ${a.floor}`,
    a.apartmentNo && `Daire: ${a.apartmentNo}`,
    a.livesInSite && a.siteName && `Site: ${a.siteName}`,
    a.livesInSite && a.block && `Blok: ${a.block}`,
  ].filter(Boolean) as string[];
  return parts.join(", ") || "—";
}

/** Sipariş / müşteri doğrulaması (e-posta ve konum hariç) */
export function validateCustomerFormRequired(v: CustomerFormValues): string | null {
  const t = (s: string) => s.trim();
  if (!t(v.firstName)) return "Ad zorunludur.";
  if (!t(v.lastName)) return "Soyad zorunludur.";
  if (!t(v.phone)) return "Telefon zorunludur.";
  if (!t(v.neighborhood)) return "Mahalle zorunludur.";
  if (!t(v.street)) return "Sokak / cadde zorunludur.";
  if (!t(v.buildingNo)) return "Apartman numarası zorunludur.";
  if (!t(v.buildingName)) return "Apartman adı zorunludur.";
  if (!t(v.floor)) return "Kat zorunludur.";
  if (!t(v.apartmentNo)) return "Daire numarası zorunludur.";
  if (v.livesInSite) {
    if (!t(v.siteName)) return "Site adı zorunludur.";
    if (!t(v.block)) return "Blok zorunludur.";
  }
  return null;
}

/** Gel-al siparişte adres alanları zorunlu değil. */
export function validateCustomerFormForFulfillment(
  v: CustomerFormValues,
  fulfillmentType: "pickup" | "delivery",
): string | null {
  const t = (s: string) => s.trim();
  if (!t(v.firstName)) return "Ad zorunludur.";
  if (!t(v.lastName)) return "Soyad zorunludur.";
  if (!t(v.phone)) return "Telefon zorunludur.";
  if (fulfillmentType === "pickup") return null;
  return validateCustomerFormRequired(v);
}
