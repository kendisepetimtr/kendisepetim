export const MENU_IMAGES_BUCKET = "menu-images";
export const MAX_MENU_IMAGE_FILE_BYTES = 2 * 1024 * 1024;

export const MENU_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export function isAllowedMenuImageType(type: string): boolean {
  return MENU_IMAGE_MIME_TYPES.includes(type as (typeof MENU_IMAGE_MIME_TYPES)[number]);
}

export function getMenuImageExtension(type: string): string {
  if (type === "image/jpeg") return "jpg";
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "bin";
}
