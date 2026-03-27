"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "../../lib/supabase";
import { getCurrentRestaurantContext } from "./membership";

function optionalText(value: FormDataEntryValue | null): string | null {
  const text = String(value ?? "").trim();
  return text.length > 0 ? text : null;
}

function normalizeBrandColor(value: FormDataEntryValue | null): string | null {
  const color = optionalText(value);
  if (!color) return null;
  return color.startsWith("#") ? color : `#${color}`;
}

export async function updateRestaurantSettings(formData: FormData) {
  const context = await getCurrentRestaurantContext();
  if (!context) {
    throw new Error("Unauthorized");
  }

  const name = String(formData.get("name") ?? "").trim();
  const logoUrl = optionalText(formData.get("logo_url"));
  const brandColor = normalizeBrandColor(formData.get("brand_color"));
  const isActive = String(formData.get("is_active") ?? "false") === "true";

  if (!name) {
    throw new Error("Restaurant name is required.");
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("restaurants")
    .update({
      name,
      logo_url: logoUrl,
      brand_color: brandColor,
      is_active: isActive,
    })
    .eq("id", context.restaurant.id);

  if (error) {
    throw new Error(`Failed to update restaurant settings: ${error.message}`);
  }

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
}
