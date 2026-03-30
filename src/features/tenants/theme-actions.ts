"use server";

import { revalidatePath } from "next/cache";
import { isMenuFabTheme } from "../../lib/menu-layout";
import { createServerSupabaseClient } from "../../lib/supabase";
import { getCurrentRestaurantContext } from "./membership";

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_COVER_BYTES = 5 * 1024 * 1024;

const FONT_IDS = new Set([
  "inter",
  "playfair_display",
  "dm_sans",
  "merriweather",
  "lora",
  "source_sans_3",
]);

function normalizeHexColor(value: FormDataEntryValue | null): string | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  let s = raw.startsWith("#") ? raw.slice(1) : raw;
  if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(s)) {
    throw new Error("Geçersiz renk formatı (örn. #1a1a1a veya #fff).");
  }
  if (s.length === 3) {
    s = s
      .split("")
      .map((c) => c + c)
      .join("");
  }
  return `#${s.toLowerCase()}`;
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

async function removeCoverStorage(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  storagePath: string | null,
) {
  if (!storagePath) return;
  const { error } = await supabase.storage.from("restaurant-covers").remove([storagePath]);
  if (error) {
    console.error("Kapak storage silinemedi:", error.message);
  }
}

async function uploadRestaurantCover(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  restaurantId: string,
  file: File,
): Promise<{ storagePath: string }> {
  if (file.size > MAX_COVER_BYTES) {
    throw new Error("Kapak görseli en fazla 5 MB olabilir.");
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length === 0) {
    throw new Error("Kapak dosyası boş veya okunamadı.");
  }
  const mime =
    file.type && IMAGE_TYPES.has(file.type) ? file.type : sniffImageMime(buffer);
  if (!mime || !IMAGE_TYPES.has(mime)) {
    throw new Error("Kapak yalnızca JPEG, PNG, WebP veya GIF olabilir.");
  }
  const ext = extForImageMime(mime);
  const storagePath = `${restaurantId}/cover.${ext}`;
  const { error: upErr } = await supabase.storage.from("restaurant-covers").upload(storagePath, buffer, {
    contentType: mime,
    upsert: true,
    cacheControl: "31536000",
  });
  if (upErr) {
    throw new Error(
      `Kapak yüklenemedi: ${upErr.message}. supabase/patches/storage-restaurant-covers.sql dosyasına bakın.`,
    );
  }
  return { storagePath };
}

export async function updateRestaurantTheme(formData: FormData) {
  const context = await getCurrentRestaurantContext();
  if (!context) {
    throw new Error("Unauthorized");
  }

  const brandColor = normalizeHexColor(formData.get("brand_color"));
  const themeAccent = normalizeHexColor(formData.get("theme_accent"));
  const themeSurface = normalizeHexColor(formData.get("theme_surface"));
  const fontHeading = String(formData.get("font_heading") ?? "inter").trim();
  const fontBody = String(formData.get("font_body") ?? "inter").trim();
  const menuLayoutRaw = String(formData.get("menu_layout") ?? "m1").trim();
  const removeCover = String(formData.get("remove_cover") ?? "") === "true";
  const coverFile = formData.get("cover");

  if (!brandColor || !themeAccent || !themeSurface) {
    throw new Error("Ana, vurgu ve yüzey renkleri zorunludur.");
  }
  if (!FONT_IDS.has(fontHeading) || !FONT_IDS.has(fontBody)) {
    throw new Error("Geçersiz yazı tipi seçimi.");
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

  const prevCoverPath =
    (row as { cover_storage_path?: string | null }).cover_storage_path ?? null;

  const patch: Record<string, unknown> = {
    brand_color: brandColor,
    theme_accent: themeAccent,
    theme_surface: themeSurface,
    font_heading: fontHeading,
    font_body: fontBody,
    menu_layout: menuLayoutRaw,
  };

  if (isImageFile(coverFile)) {
    await removeCoverStorage(supabase, prevCoverPath);
    const { storagePath } = await uploadRestaurantCover(
      supabase,
      context.restaurant.id,
      coverFile,
    );
    patch["cover_storage_path"] = storagePath;
  } else if (removeCover) {
    await removeCoverStorage(supabase, prevCoverPath);
    patch["cover_storage_path"] = null;
  }

  const { error } = await supabase
    .from("restaurants")
    .update(patch)
    .eq("id", context.restaurant.id);

  if (error) {
    if (isUnknownColumnError(error.message)) {
      throw new Error(
        "Tema kolonları, menü şablonu veya kapak bucket'ı eksik. Supabase'te sırayla çalıştırın: restaurants-theme-and-cover.sql, restaurants-menu-layout.sql, storage-restaurant-covers.sql; bucket'ı public yapın.",
      );
    }
    throw new Error(`Tema kaydedilemedi: ${error.message}`);
  }

  revalidatePath("/dashboard/settings/theme");
  revalidatePath("/dashboard");
  revalidatePath(`/t/${context.restaurant.slug}`);
}
