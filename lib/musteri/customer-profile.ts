import { createServiceSupabaseClient } from "@/lib/supabase/admin";
import { emptyCustomerAddress, type CustomerAddress } from "@/lib/customer-address";

export type CustomerProfile = {
  userId: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  blockedAt?: string | null;
};

export type CustomerSavedAddress = {
  id: string;
  label: string;
  address: CustomerAddress;
  isDefault: boolean;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function parseAddress(raw: unknown): CustomerAddress {
  if (!isRecord(raw)) return emptyCustomerAddress();
  const lat = raw.latitude;
  const lng = raw.longitude;
  return {
    neighborhood: typeof raw.neighborhood === "string" ? raw.neighborhood : "",
    street: typeof raw.street === "string" ? raw.street : "",
    buildingNo: typeof raw.buildingNo === "string" ? raw.buildingNo : "",
    buildingName: typeof raw.buildingName === "string" ? raw.buildingName : "",
    floor: typeof raw.floor === "string" ? raw.floor : "",
    apartmentNo: typeof raw.apartmentNo === "string" ? raw.apartmentNo : "",
    livesInSite: raw.livesInSite === true,
    siteName: typeof raw.siteName === "string" ? raw.siteName : "",
    block: typeof raw.block === "string" ? raw.block : "",
    latitude: typeof lat === "number" && Number.isFinite(lat) ? lat : null,
    longitude: typeof lng === "number" && Number.isFinite(lng) ? lng : null,
    courierNote: typeof raw.courierNote === "string" ? raw.courierNote : "",
  };
}

export async function getCustomerProfileByUserId(userId: string): Promise<CustomerProfile | null> {
  try {
    const svc = createServiceSupabaseClient();
    const { data, error } = await svc
      .from("customer_profiles")
      .select("user_id, first_name, last_name, phone, email, blocked_at")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) {
      const fallback = await svc
        .from("customer_profiles")
        .select("user_id, first_name, last_name, phone")
        .eq("user_id", userId)
        .maybeSingle();
      if (fallback.error || !fallback.data) return null;
      return {
        userId: fallback.data.user_id as string,
        firstName: (fallback.data.first_name as string) ?? "",
        lastName: (fallback.data.last_name as string) ?? "",
        phone: (fallback.data.phone as string) ?? "",
        blockedAt: null,
      };
    }
    if (!data) return null;
    return {
      userId: data.user_id as string,
      firstName: (data.first_name as string) ?? "",
      lastName: (data.last_name as string) ?? "",
      phone: (data.phone as string) ?? "",
      email: (data.email as string) ?? "",
      blockedAt: (data.blocked_at as string | null) ?? null,
    };
  } catch {
    return null;
  }
}

export async function upsertCustomerProfile(input: {
  userId: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const svc = createServiceSupabaseClient();
    const payload: Record<string, string> = {
      user_id: input.userId,
      first_name: input.firstName.trim(),
      last_name: input.lastName.trim(),
      phone: input.phone.trim(),
    };
    if (typeof input.email === "string") {
      payload.email = input.email.trim().toLowerCase();
    }
    const { error } = await svc.from("customer_profiles").upsert(payload, { onConflict: "user_id" });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Profil kaydedilemedi." };
  }
}

export async function loadCustomerAddresses(userId: string): Promise<CustomerSavedAddress[]> {
  try {
    const svc = createServiceSupabaseClient();
    const { data, error } = await svc
      .from("customer_addresses")
      .select("id, label, address_json, is_default")
      .eq("user_id", userId)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });
    if (error || !data) return [];
    return data.map((row) => ({
      id: row.id as string,
      label: ((row.label as string) || "Adres").trim() || "Adres",
      address: parseAddress(row.address_json),
      isDefault: row.is_default === true,
    }));
  } catch {
    return [];
  }
}

export async function insertCustomerAddress(input: {
  userId: string;
  label: string;
  address: CustomerAddress;
  isDefault: boolean;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    const svc = createServiceSupabaseClient();
    if (input.isDefault) {
      await svc.from("customer_addresses").update({ is_default: false }).eq("user_id", input.userId);
    }
    const { data, error } = await svc
      .from("customer_addresses")
      .insert({
        user_id: input.userId,
        label: input.label.trim() || "Adres",
        address_json: input.address,
        is_default: input.isDefault,
      })
      .select("id")
      .single();
    if (error || !data) return { ok: false, error: error?.message ?? "Adres eklenemedi." };
    return { ok: true, id: data.id as string };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Adres eklenemedi." };
  }
}

export async function updateCustomerAddress(input: {
  userId: string;
  id: string;
  label: string;
  address: CustomerAddress;
  isDefault: boolean;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const svc = createServiceSupabaseClient();
    if (input.isDefault) {
      await svc.from("customer_addresses").update({ is_default: false }).eq("user_id", input.userId);
    }
    const { error } = await svc
      .from("customer_addresses")
      .update({
        label: input.label.trim() || "Adres",
        address_json: input.address,
        is_default: input.isDefault,
      })
      .eq("id", input.id)
      .eq("user_id", input.userId);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Adres güncellenemedi." };
  }
}

export async function deleteCustomerAddress(
  userId: string,
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const svc = createServiceSupabaseClient();
    const { error } = await svc.from("customer_addresses").delete().eq("id", id).eq("user_id", userId);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Adres silinemedi." };
  }
}
