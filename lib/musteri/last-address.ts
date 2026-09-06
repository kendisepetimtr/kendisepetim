const LAST_SAVED_ADDRESS_KEY = "ks_last_saved_address_id";

export function getLastSavedAddressId(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(LAST_SAVED_ADDRESS_KEY)?.trim() ?? "";
  } catch {
    return "";
  }
}

export function setLastSavedAddressId(id: string): void {
  if (typeof window === "undefined") return;
  const value = id.trim();
  if (!value) return;
  try {
    window.localStorage.setItem(LAST_SAVED_ADDRESS_KEY, value);
  } catch {
    /* ignore quota */
  }
}
