import { emptyCustomerAddress, type CustomerAddress } from "@/lib/customer-address";
import type { DashboardCustomer } from "@/lib/dashboard/customer-types";
import { getAuthenticatedOwnerTenant } from "@/lib/dashboard/owner-tenant";
import { createServiceSupabaseClient } from "@/lib/supabase/admin";
import type { FulfillmentType } from "@/lib/fulfillment";

export type { DashboardCustomer } from "@/lib/dashboard/customer-types";
export { customerChannelLabel } from "@/lib/dashboard/customer-types";

type OrderCustomerRow = {
  id: string;
  created_at: string;
  customer_first_name: string | null;
  customer_last_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  address_json: unknown;
  fulfillment_type: string | null;
};

function digitsOnly(phone: string): string {
  return phone.replace(/\D/g, "");
}

function phoneKey(phone: string): string {
  const digits = digitsOnly(phone);
  if (digits.length < 7) return "";
  return digits.length >= 10 ? digits.slice(-10) : digits;
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

function asFulfillment(raw: string | null): FulfillmentType | null {
  if (raw === "pickup" || raw === "delivery" || raw === "dine_in") return raw;
  return null;
}

/**
 * Paket + gel-al/QR siparişlerinden benzersiz müşteriler (telefona göre).
 * Masa siparişleri dahil edilmez.
 */
export async function loadDashboardCustomers(): Promise<
  { ok: true; customers: DashboardCustomer[] } | { ok: false; error: string }
> {
  const tenant = await getAuthenticatedOwnerTenant();
  if (!tenant) return { ok: false, error: "Oturum bulunamadı." };

  try {
    const svc = createServiceSupabaseClient();
    const byPhone = new Map<
      string,
      {
        firstName: string;
        lastName: string;
        phone: string;
        email: string;
        address: CustomerAddress;
        orderCount: number;
        lastOrderAt: string;
        lastFulfillmentType: FulfillmentType | null;
      }
    >();

    const pageSize = 1000;
    let from = 0;

    for (;;) {
      const { data, error } = await svc
        .from("orders")
        .select(
          "id, created_at, customer_first_name, customer_last_name, customer_phone, customer_email, address_json, fulfillment_type",
        )
        .eq("tenant_id", tenant.id)
        .in("fulfillment_type", ["delivery", "pickup"])
        .order("created_at", { ascending: false })
        .range(from, from + pageSize - 1);

      if (error) return { ok: false, error: error.message };
      if (!data || data.length === 0) break;

      for (const row of data as OrderCustomerRow[]) {
        const phone = (row.customer_phone ?? "").trim();
        if (!phone || phone === "-") continue;
        const key = phoneKey(phone);
        if (!key) continue;

        const existing = byPhone.get(key);
        if (existing) {
          existing.orderCount += 1;
          continue;
        }

        const firstName = (row.customer_first_name ?? "").trim() || "Müşteri";
        const lastName = (row.customer_last_name ?? "").trim();
        byPhone.set(key, {
          firstName,
          lastName,
          phone,
          email: (row.customer_email ?? "").trim(),
          address: normalizeAddress(row.address_json),
          orderCount: 1,
          lastOrderAt: row.created_at,
          lastFulfillmentType: asFulfillment(row.fulfillment_type),
        });
      }

      if (data.length < pageSize) break;
      from += pageSize;
    }

    const customers: DashboardCustomer[] = Array.from(byPhone.entries())
      .map(([key, c]) => ({
        id: `order-${key}`,
        firstName: c.firstName,
        lastName: c.lastName,
        phone: c.phone,
        email: c.email,
        address: c.address,
        orderCount: c.orderCount,
        lastOrderAt: c.lastOrderAt,
        lastFulfillmentType: c.lastFulfillmentType,
        fromOrders: true as const,
      }))
      .sort((a, b) => b.lastOrderAt.localeCompare(a.lastOrderAt));

    return { ok: true, customers };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Müşteriler yüklenemedi.",
    };
  }
}
