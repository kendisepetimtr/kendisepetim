import { readSharedJson, writeSharedJson } from "@/lib/shared-browser-storage";

const LAST_SAVED_ADDRESS_KEY = "ks_last_saved_address_id";

function readLegacyPlain(): string {
  if (typeof window === "undefined") return "";
  try {
    const raw = window.localStorage.getItem(LAST_SAVED_ADDRESS_KEY)?.trim() ?? "";
    if (!raw) return "";
    // Eski düz string veya zarflı JSON
    if (raw.startsWith("{")) {
      try {
        const p = JSON.parse(raw) as { v?: unknown };
        return typeof p.v === "string" ? p.v.trim() : "";
      } catch {
        return "";
      }
    }
    return raw;
  } catch {
    return "";
  }
}

export function getLastSavedAddressId(): string {
  if (typeof window === "undefined") return "";
  try {
    const v = readSharedJson<string>(LAST_SAVED_ADDRESS_KEY);
    if (typeof v === "string" && v.trim()) return v.trim();
    const legacy = readLegacyPlain();
    if (legacy) {
      writeSharedJson(LAST_SAVED_ADDRESS_KEY, legacy);
      return legacy;
    }
    return "";
  } catch {
    return readLegacyPlain();
  }
}

export function setLastSavedAddressId(id: string): void {
  if (typeof window === "undefined") return;
  const value = id.trim();
  if (!value) return;
  writeSharedJson(LAST_SAVED_ADDRESS_KEY, value);
}
