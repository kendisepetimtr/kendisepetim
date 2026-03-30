const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url) {
  throw new Error("Missing env: NEXT_PUBLIC_SUPABASE_URL");
}

if (!anonKey) {
  throw new Error("Missing env: NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

export const supabaseUrl: string = url;
export const supabaseAnonKey: string = anonKey;
