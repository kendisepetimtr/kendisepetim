"use server";

import { revalidatePath } from "next/cache";
import { randomBytes, scryptSync } from "crypto";
import { createServerSupabaseClient } from "../../lib/supabase";
import { buildRestaurantLogosPublicUrl } from "../../lib/supabase/storage-public-url";
import { getCurrentRestaurantContext } from "./membership";

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_LOGO_BYTES = 2 * 1024 * 1024;

function optionalText(value: FormDataEntryValue | null): string | null {
  const text = String(value ?? "").trim();
  return text.length > 0 ? text : null;
}

function optionalNumber(value: FormDataEntryValue | null): number | null {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const num = Number(text);
  return Number.isFinite(num) ? num : null;
}

function normalizeBrandColor(value: FormDataEntryValue | null): string | null {
  const color = optionalText(value);
  if (!color) return null;
  return color.startsWith("#") ? color : `#${color}`;
}

function isImageFile(value: FormDataEntryValue | null): value is File {
  return (
    typeof value === "object" &&
    value !== null &&
    "size" in value &&
    typeof (value as File).arrayBuffer === "function" &&
    (value as File).size > 0
  );
}

function sniffImageMime(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png";
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) return "image/gif";
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") {
    return "image/webp";
  }
  return null;
}

function extForImageMime(mime: string): string {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  return "bin";
}

function isUnknownColumnError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("schema cache") ||
    (m.includes("could not find") && m.includes("column")) ||
    (m.includes("column") && m.includes("does not exist"))
  );
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const digest = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${digest}`;
}

async function removeLogoStorage(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  storagePath: string | null,
) {
  if (!storagePath) return;
  const { error } = await supabase.storage.from("restaurant-logos").remove([storagePath]);
  if (error) {
    console.error("Logo storage silinemedi:", error.message);
  }
}

async function uploadRestaurantLogo(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  restaurantId: string,
  file: File,
): Promise<{ publicUrl: string; storagePath: string }> {
  if (file.size > MAX_LOGO_BYTES) {
    throw new Error("Logo en fazla 2 MB olabilir.");
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length === 0) {
    throw new Error("Logo dosyası boş veya okunamadı.");
  }
  const mime =
    file.type && IMAGE_TYPES.has(file.type) ? file.type : sniffImageMime(buffer);
  if (!mime || !IMAGE_TYPES.has(mime)) {
    throw new Error("Logo yalnızca JPEG, PNG, WebP veya GIF olabilir.");
  }
  const ext = extForImageMime(mime);
  const storagePath = `${restaurantId}/logo.${ext}`;
  const { error: upErr } = await supabase.storage.from("restaurant-logos").upload(storagePath, buffer, {
    contentType: mime,
    upsert: true,
    cacheControl: "31536000",
  });
  if (upErr) {
    throw new Error(
      `Logo yüklenemedi: ${upErr.message}. Bucket için supabase/patches/storage-restaurant-logos.sql dosyasına bakın.`,
    );
  }
  return { publicUrl: buildRestaurantLogosPublicUrl(storagePath), storagePath };
}

export async function updateRestaurantSettings(formData: FormData) {
  const context = await getCurrentRestaurantContext();
  if (!context) {
    throw new Error("Unauthorized");
  }

  const name = String(formData.get("name") ?? "").trim();
  const description = optionalText(formData.get("description"));
  const waiterPinRaw = String(formData.get("waiter_pin") ?? "").trim();
  const adminUsername = optionalText(formData.get("admin_username"));
  const adminPassword = String(formData.get("admin_password") ?? "").trim();
  const tableCountRaw = String(formData.get("table_count") ?? "").trim();
  const brandColor = normalizeBrandColor(formData.get("brand_color"));
  const isActive = String(formData.get("is_active") ?? "false") === "true";
  const fabCallEnabled = String(formData.get("fab_call_enabled") ?? "false") === "true";
  const fabCallPhone = optionalText(formData.get("fab_call_phone"));
  const fabWhatsappEnabled = String(formData.get("fab_whatsapp_enabled") ?? "false") === "true";
  const fabWhatsappPhone = optionalText(formData.get("fab_whatsapp_phone"));
  const fabLocationEnabled = String(formData.get("fab_location_enabled") ?? "false") === "true";
  const fabLocationLat = optionalNumber(formData.get("fab_location_lat"));
  const fabLocationLng = optionalNumber(formData.get("fab_location_lng"));
  const removeLogo = String(formData.get("remove_logo") ?? "") === "true";
  const logoFile = formData.get("logo");

  if (!name) {
    throw new Error("Restaurant name is required.");
  }
  if (waiterPinRaw && !/^\d{4}$/.test(waiterPinRaw)) {
    throw new Error("Garson PIN'i 4 haneli sayı olmalıdır.");
  }
  if (adminPassword && adminPassword.length < 4) {
    throw new Error("Admin şifresi en az 4 karakter olmalıdır.");
  }
  const tableCount =
    tableCountRaw.length > 0 ? Number.parseInt(tableCountRaw, 10) : null;
  if (
    tableCountRaw.length > 0 &&
    (tableCount == null || !Number.isFinite(tableCount) || tableCount < 1 || tableCount > 200)
  ) {
    throw new Error("Masa sayısı 1 ile 200 arasında olmalıdır.");
  }
  if (fabCallEnabled && !fabCallPhone) {
    throw new Error("Arama için cep telefonu numarası zorunludur.");
  }
  if (fabWhatsappEnabled && !fabWhatsappPhone) {
    throw new Error("WhatsApp için telefon numarası zorunludur.");
  }
  if (fabLocationEnabled && (fabLocationLat == null || fabLocationLng == null)) {
    throw new Error("Konum açıkken koordinatlar zorunludur. Lütfen 'Konumu Al' düğmesini kullanın.");
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Oturum bulunamadı.");
  }

  const { data: row, error: fetchErr } = await supabase
    .from("restaurants")
    .select("*")
    .eq("id", context.restaurant.id)
    .maybeSingle();

  if (fetchErr || !row) {
    throw new Error(`Restoran okunamadı: ${fetchErr?.message ?? "unknown"}`);
  }

  const prevPath =
    (row as { logo_storage_path?: string | null }).logo_storage_path ?? null;

  const patch: Record<string, unknown> = {
    name,
    description,
    waiter_pin: waiterPinRaw || null,
    admin_username: adminUsername,
    table_count: tableCount,
    brand_color: brandColor,
    is_active: isActive,
    fab_call_enabled: fabCallEnabled,
    fab_call_phone: fabCallEnabled ? fabCallPhone : null,
    fab_whatsapp_enabled: fabWhatsappEnabled,
    fab_whatsapp_phone: fabWhatsappEnabled ? fabWhatsappPhone : null,
    fab_location_enabled: fabLocationEnabled,
    fab_location_lat: fabLocationEnabled ? fabLocationLat : null,
    fab_location_lng: fabLocationEnabled ? fabLocationLng : null,
  };
  if (adminPassword) {
    patch.admin_password_hash = hashPassword(adminPassword);
  }

  if (isImageFile(logoFile)) {
    await removeLogoStorage(supabase, prevPath);
    const { publicUrl, storagePath } = await uploadRestaurantLogo(
      supabase,
      context.restaurant.id,
      logoFile,
    );
    patch.logo_url = publicUrl;
    patch.logo_storage_path = storagePath;
  } else if (removeLogo) {
    await removeLogoStorage(supabase, prevPath);
    patch.logo_url = null;
    patch.logo_storage_path = null;
  }

  let { error } = await supabase
    .from("restaurants")
    .update(patch)
    .eq("id", context.restaurant.id);

  if (error && isUnknownColumnError(error.message) && "logo_storage_path" in patch) {
    const legacy: Record<string, unknown> = {
      name,
      description,
      waiter_pin: waiterPinRaw || null,
      admin_username: adminUsername,
      table_count: tableCount,
      brand_color: brandColor,
      is_active: isActive,
      fab_call_enabled: fabCallEnabled,
      fab_call_phone: fabCallEnabled ? fabCallPhone : null,
      fab_whatsapp_enabled: fabWhatsappEnabled,
      fab_whatsapp_phone: fabWhatsappEnabled ? fabWhatsappPhone : null,
      fab_location_enabled: fabLocationEnabled,
      fab_location_lat: fabLocationEnabled ? fabLocationLat : null,
      fab_location_lng: fabLocationEnabled ? fabLocationLng : null,
    };
    if ("admin_password_hash" in patch) {
      legacy.admin_password_hash = patch.admin_password_hash;
    }
    if ("logo_url" in patch) {
      legacy.logo_url = patch.logo_url;
    }
    const retry = await supabase
      .from("restaurants")
      .update(legacy)
      .eq("id", context.restaurant.id);
    error = retry.error;
  }

  if (error) {
    if (isUnknownColumnError(error.message)) {
      throw new Error(
        "Restoran ayar kolonları eksik. Supabase patch dosyalarını güncel sırayla çalıştırın.",
      );
    }
    throw new Error(`Failed to update restaurant settings: ${error.message}`);
  }

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
}
