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
