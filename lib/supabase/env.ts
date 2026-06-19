/**
 * Ortak env okuma — hem eski `anon` hem yeni publishable anahtar adlarını destekler.
 * NEXT_PUBLIC_* değişkenleri tarayıcıya sızmak için kasıtlı; sadece anon/publishable kullanın, asla service_role koymayın.
 */
export function getSupabaseEnv(): { url: string; anonKey: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

/** Eksik Supabase ortam değişkenlerini insan okunur metin olarak döner. */
export function describeSupabaseEnvGap(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (url && anonKey) return null;

  const missing: string[] = [];
  if (!url) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!anonKey) {
    missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY veya NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  }
  return missing.join(", ");
}
