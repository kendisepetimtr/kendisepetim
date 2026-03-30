import { supabaseUrl } from "./env";

const PRODUCT_IMAGES_BUCKET = "product-images";
const RESTAURANT_LOGOS_BUCKET = "restaurant-logos";
const RESTAURANT_COVERS_BUCKET = "restaurant-covers";

function encodeStoragePathSegments(storagePath: string): string {
  return storagePath
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

/** Storage içindeki nesne yolu → herkese açık okuma URL'si (bucket public olmalı). */
export function buildProductImagesPublicUrl(storagePath: string): string {
  const base = supabaseUrl.replace(/\/+$/, "");
  const encoded = encodeStoragePathSegments(storagePath);
  return `${base}/storage/v1/object/public/${PRODUCT_IMAGES_BUCKET}/${encoded}`;
}

export function buildRestaurantLogosPublicUrl(storagePath: string): string {
  const base = supabaseUrl.replace(/\/+$/, "");
  const encoded = encodeStoragePathSegments(storagePath);
  return `${base}/storage/v1/object/public/${RESTAURANT_LOGOS_BUCKET}/${encoded}`;
}

export function buildRestaurantCoversPublicUrl(storagePath: string): string {
  const base = supabaseUrl.replace(/\/+$/, "");
  const encoded = encodeStoragePathSegments(storagePath);
  return `${base}/storage/v1/object/public/${RESTAURANT_COVERS_BUCKET}/${encoded}`;
}
