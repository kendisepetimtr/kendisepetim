"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { persistAuthIntent } from "@/lib/auth-intent-persist";
import {
  RESTAURANT_ACCOUNT_ON_CUSTOMER_LOGIN,
  RESTAURANT_SESSION_BLOCKS_CUSTOMER_REGISTER,
  ensureCustomerAccount,
  resolveAccountKind,
} from "@/lib/account-kind";
import { humanizeLoginError } from "@/lib/auth-errors";
import type { CustomerAddress } from "@/lib/customer-address";
import { signOutDashboardSession } from "@/lib/dashboard/sign-out";
import {
  deleteCustomerAddress,
  insertCustomerAddress,
  updateCustomerAddress,
  upsertCustomerProfile,
} from "@/lib/musteri/customer-profile";
import {
  CUSTOMER_EMAIL_VERIFIED_LOGIN_PATH,
  MUSTERI_HOME_PATH,
  MUSTERI_LOGIN_PATH,
} from "@/lib/musteri/paths";
import { CUSTOMER_BLOCKED_LOGIN_MESSAGE, getCustomerBlockState } from "@/lib/superadmin/customers-service";
import { normalizeTrPhone } from "@/lib/phone-tr";
import { describeSupabaseEnvGap } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getOAuthSiteUrl } from "@/lib/site-url";
import { buildAuthCallbackUrl } from "@/lib/supabase/auth-urls";

export type MusteriAuthState = { error: string } | { needsEmailConfirm: true; email: string } | null;

export async function musteriLoginAction(
  _prev: MusteriAuthState,
  formData: FormData,
): Promise<MusteriAuthState> {
  const envGap = describeSupabaseEnvGap();
  if (envGap) {
    return { error: `Giriş yapılamıyor: ${envGap}.` };
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const nextRaw = String(formData.get("next") ?? MUSTERI_HOME_PATH);
  const next =
    nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : MUSTERI_HOME_PATH;
  if (!email || !password) return { error: "E-posta ve şifre gerekli." };

  await persistAuthIntent("customer");

  const supabase = await createServerSupabaseClient();
  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    /* devam */
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: humanizeLoginError(error.message) };

  const user = data.user;
  if (!user) return { error: "E-posta veya şifre hatalı." };

  const kind = await ensureCustomerAccount(user);
  if (kind === "restaurant") {
    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      /* devam */
    }
    return { error: RESTAURANT_ACCOUNT_ON_CUSTOMER_LOGIN };
  }

  if (kind !== "customer") {
    return { error: "Müşteri hesabı oluşturulamadı. Lütfen tekrar deneyin." };
  }

  const block = await getCustomerBlockState(user.id);
  if (block.blocked) {
    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      /* devam */
    }
    return { error: CUSTOMER_BLOCKED_LOGIN_MESSAGE };
  }

  redirect(next);
}

export async function musteriRegisterAction(
  _prev: MusteriAuthState,
  formData: FormData,
): Promise<MusteriAuthState> {
  const envGap = describeSupabaseEnvGap();
  if (envGap) return { error: `Kayıt yapılamıyor: ${envGap}.` };

  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const passwordAgain = String(formData.get("passwordAgain") ?? "");
  const acceptedTerms = formData.get("acceptedTerms") === "on";

  if (!firstName || !lastName) return { error: "Ad ve soyad gerekli." };
  if (!email) return { error: "E-posta gerekli." };
  const normalizedPhone = normalizeTrPhone(phone);
  if (!normalizedPhone) return { error: "Geçerli bir Türkiye cep telefonu girin." };
  if (password.length < 8) return { error: "Şifre en az 8 karakter olmalıdır." };
  if (password !== passwordAgain) return { error: "Şifreler eşleşmiyor." };
  if (!acceptedTerms) return { error: "Devam etmek için kullanım şartlarını onaylayın." };

  await persistAuthIntent("customer");

  const supabase = await createServerSupabaseClient();
  const {
    data: { user: existingUser },
  } = await supabase.auth.getUser();

  if (existingUser) {
    const kind = await resolveAccountKind(existingUser);
    if (kind === "restaurant") {
      return { error: RESTAURANT_SESSION_BLOCKS_CUSTOMER_REGISTER };
    }
    if (kind === "customer") {
      redirect(MUSTERI_HOME_PATH);
    }
    const profile = await upsertCustomerProfile({
      userId: existingUser.id,
      firstName,
      lastName,
      phone: normalizedPhone,
      email: existingUser.email ?? email,
    });
    if (!profile.ok) return { error: profile.error };
    await supabase.auth.updateUser({ data: { account_kind: "customer", first_name: firstName, last_name: lastName } });
    redirect(MUSTERI_HOME_PATH);
  }

  const siteBase = await getOAuthSiteUrl();
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        account_kind: "customer",
        first_name: firstName,
        last_name: lastName,
      },
      ...(siteBase
        ? { emailRedirectTo: buildAuthCallbackUrl(siteBase, CUSTOMER_EMAIL_VERIFIED_LOGIN_PATH) }
        : {}),
    },
  });

  if (signUpError) {
    if (signUpError.message.includes("already registered")) {
      return { error: "Bu e-posta ile zaten bir hesap var. Restoran hesabıysa ayrı e-posta kullanın; değilse giriş yapın." };
    }
    return { error: signUpError.message };
  }

  const userId = signUpData.user?.id;
  if (!userId) return { error: "Hesap oluşturulamadı." };

  const profile = await upsertCustomerProfile({
    userId,
    firstName,
    lastName,
    phone: normalizedPhone,
    email,
  });
  if (!profile.ok) return { error: profile.error };

  if (signUpData.session) {
    redirect(MUSTERI_HOME_PATH);
  }

  return { needsEmailConfirm: true, email };
}

export async function signOutMusteriAction(): Promise<void> {
  await signOutDashboardSession();
  redirect(MUSTERI_LOGIN_PATH);
}

export async function clearMusteriLoginSessionAction(): Promise<void> {
  await signOutDashboardSession();
  redirect(MUSTERI_LOGIN_PATH);
}

async function requireCustomerUserId(): Promise<string | { error: string }> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Giriş yapmanız gerekiyor." };
  const kind = await resolveAccountKind(user);
  if (kind === "restaurant") return { error: RESTAURANT_ACCOUNT_ON_CUSTOMER_LOGIN };
  if (kind !== "customer") return { error: "Müşteri hesabı bulunamadı." };
  const block = await getCustomerBlockState(user.id);
  if (block.blocked) return { error: CUSTOMER_BLOCKED_LOGIN_MESSAGE };
  return user.id;
}

export async function saveCustomerProfileAction(input: {
  firstName: string;
  lastName: string;
  phone: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const userId = await requireCustomerUserId();
  if (typeof userId !== "string") return { ok: false, error: userId.error };
  if (!input.firstName.trim()) return { ok: false, error: "Ad gerekli." };
  const res = await upsertCustomerProfile({
    userId,
    firstName: input.firstName,
    lastName: input.lastName,
    phone: input.phone,
  });
  if (!res.ok) return res;
  revalidatePath("/musteri/hesap");
  return { ok: true };
}

export async function saveCustomerAddressAction(input: {
  id?: string;
  label: string;
  address: CustomerAddress;
  isDefault: boolean;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const userId = await requireCustomerUserId();
  if (typeof userId !== "string") return { ok: false, error: userId.error };
  const res = input.id
    ? await updateCustomerAddress({
        userId,
        id: input.id,
        label: input.label,
        address: input.address,
        isDefault: input.isDefault,
      })
    : await insertCustomerAddress({
        userId,
        label: input.label,
        address: input.address,
        isDefault: input.isDefault,
      });
  if (!res.ok) return { ok: false, error: res.error };
  revalidatePath("/musteri/adresler");
  return { ok: true };
}

export async function deleteCustomerAddressAction(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const userId = await requireCustomerUserId();
  if (typeof userId !== "string") return { ok: false, error: userId.error };
  const res = await deleteCustomerAddress(userId, id);
  if (!res.ok) return res;
  revalidatePath("/musteri/adresler");
  return { ok: true };
}
