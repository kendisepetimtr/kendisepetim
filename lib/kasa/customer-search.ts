import { emptyCustomerAddress, type CustomerAddress } from "@/lib/customer-address";
import { createServiceSupabaseClient } from "@/lib/supabase/admin";

export type CashierCustomerMatch = {
  phone: string;
  firstName: string;
  lastName: string;
  address: CustomerAddress;
  lastOrderAt: string;
  orderCount: number;
};

export type CashierPastOrderSummary = {
  id: string;
  orderCode: string;
  createdAt: string;
  total: number;
  fulfillmentType: string;
};

type OrderSearchRow = {
  id: string;
  created_at: string;
  order_code?: string;
  total?: number;
  customer_first_name: string | null;
  customer_last_name: string | null;
  customer_phone: string | null;
  address_json: unknown;
  fulfillment_type: string | null;
};

function digitsOnly(phone: string): string {
  return phone.replace(/\D/g, "");
}

function normalizeAddress(raw: unknown): CustomerAddress {
  if (!raw || typeof raw !== "object") return emptyCustomerAddress();
  const a = raw as Record<string, unknown>;
  return {
    neighborhood: typeof a.neighborhood === "string" ? a.neighborhood : "",
    street: typeof a.street === "string" ? a.street : "",
    buildingNo: typeof a.buildingNo === "string" ? a.buildingNo : "",
    buildingName: typeof a.buildingName === "string" ? a.buildingName : "",
    floor: typeof a.floor === "string" ? a.floor : "",
    apartmentNo: typeof a.apartmentNo === "string" ? a.apartmentNo : "",
    livesInSite: a.livesInSite === true,
    siteName: typeof a.siteName === "string" ? a.siteName : "",
    block: typeof a.block === "string" ? a.block : "",
  };
}

function sanitizeSearchText(raw: string): string {
  let out = "";
  for (const ch of raw) {
    if (ch === "%" || ch === "_" || ch === "(" || ch === ")" || ch === "'" || ch === '"') continue;
    out += ch;
  }
  return out.replace(/\s+/g, " ").trim();
}

/** Telefon / isim ile geçmiş paket-gelal müşteri önerileri (orders tablosu). */
export async function searchCashierCustomers(
  tenantId: string,
  query: string,
): Promise<{ ok: true; matches: CashierCustomerMatch[] } | { ok: false; error: string }> {
  const q = query.trim();
  if (q.length < 2) {
    return { ok: true, matches: [] };
  }

  try {
    const svc = createServiceSupabaseClient();
    const digits = digitsOnly(q);
    const isPhoneQuery = digits.length >= 3 && /^[\d\s+()-]+$/.test(q);

    const { data, error } = await svc
      .from("orders")
      .select(
        "id, created_at, customer_first_name, customer_last_name, customer_phone, address_json, fulfillment_type",
      )
      .eq("tenant_id", tenantId)
      .in("fulfillment_type", ["delivery", "pickup"])
      .order("created_at", { ascending: false })
      .limit(isPhoneQuery ? 250 : 120);

    if (error) return { ok: false, error: error.message };

    const rows = (data ?? []) as OrderSearchRow[];
    const needleName = sanitizeSearchText(q).toLocaleLowerCase("tr-TR");
    const byPhone = new Map<string, CashierCustomerMatch>();

    for (const row of rows) {
      const phone = (row.customer_phone ?? "").trim();
      if (!phone || phone === "-") continue;

      const phoneDigits = digitsOnly(phone);
      const firstName = (row.customer_first_name ?? "").trim();
      const lastName = (row.customer_last_name ?? "").trim();
      const fullName = `${firstName} ${lastName}`.trim().toLocaleLowerCase("tr-TR");

      let matched = false;
      if (isPhoneQuery) {
        matched = phoneDigits.includes(digits);
      } else {
        matched =
          fullName.includes(needleName) ||
          firstName.toLocaleLowerCase("tr-TR").includes(needleName) ||
          lastName.toLocaleLowerCase("tr-TR").includes(needleName);
      }
      if (!matched) continue;

      const key = phoneDigits || phone;
      const existing = byPhone.get(key);
      if (existing) {
        existing.orderCount += 1;
        continue;
      }
      byPhone.set(key, {
        phone,
        firstName,
        lastName,
        address: normalizeAddress(row.address_json),
        lastOrderAt: row.created_at,
        orderCount: 1,
      });
    }

    const matches = Array.from(byPhone.values())
      .sort((a, b) => b.lastOrderAt.localeCompare(a.lastOrderAt))
      .slice(0, 8);

    return { ok: true, matches };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Arama başarısız." };
  }
}

export async function loadCustomerPastOrders(
  tenantId: string,
  phone: string,
): Promise<{ ok: true; orders: CashierPastOrderSummary[] } | { ok: false; error: string }> {
  const digits = digitsOnly(phone);
  if (digits.length < 7) return { ok: true, orders: [] };

  try {
    const svc = createServiceSupabaseClient();
    const { data, error } = await svc
      .from("orders")
      .select("id, order_code, created_at, total, fulfillment_type, customer_phone")
      .eq("tenant_id", tenantId)
      .in("fulfillment_type", ["delivery", "pickup"])
      .order("created_at", { ascending: false })
      .limit(80);

    if (error) return { ok: false, error: error.message };

    const orders: CashierPastOrderSummary[] = ((data ?? []) as OrderSearchRow[])
      .filter((row) => digitsOnly(row.customer_phone ?? "").includes(digits.slice(-10)))
      .slice(0, 12)
      .map((row) => ({
        id: row.id,
        orderCode: (row.order_code as string) ?? "",
        createdAt: row.created_at,
        total: Number(row.total) || 0,
        fulfillmentType: row.fulfillment_type ?? "delivery",
      }));

    return { ok: true, orders };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Geçmiş yüklenemedi." };
  }
}
