import { resolveAccountKind, type AccountKind } from "@/lib/account-kind";
import { getCustomerProfileByUserId } from "@/lib/musteri/customer-profile";
import { tryCreateServerSupabaseClient } from "@/lib/supabase/server";

export type MusteriSession = {
  kind: AccountKind | "guest";
  userId: string | null;
  email: string | null;
  firstName: string;
  blocked: boolean;
};

export async function loadMusteriSession(): Promise<MusteriSession> {
  const empty: MusteriSession = { kind: "guest", userId: null, email: null, firstName: "", blocked: false };
  try {
    const supabase = await tryCreateServerSupabaseClient();
    if (!supabase) return empty;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return empty;

    const kind = await resolveAccountKind(user);
    if (kind === "customer") {
      const profile = await getCustomerProfileByUserId(user.id);
      const metaName =
        (typeof user.user_metadata?.first_name === "string" && user.user_metadata.first_name) ||
        (typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name) ||
        "";
      return {
        kind: "customer",
        userId: user.id,
        email: user.email ?? null,
        firstName: profile?.firstName || metaName.split(" ")[0] || "",
        blocked: Boolean(profile?.blockedAt),
      };
    }

    if (kind === "restaurant") {
      return {
        kind: "restaurant",
        userId: user.id,
        email: user.email ?? null,
        firstName: "",
        blocked: false,
      };
    }

    return {
      kind: "unknown",
      userId: user.id,
      email: user.email ?? null,
      firstName: "",
      blocked: false,
    };
  } catch {
    return empty;
  }
}
