"use server";

import {
  signOutDashboardAndRedirect,
  signOutDashboardSession,
} from "@/lib/dashboard/sign-out";
import { redirect } from "next/navigation";

/** @deprecated Panelde form action olarak `signOutDashboardAction` kullanın. */
export async function signOutFromDashboard(): Promise<void> {
  return signOutDashboardSession();
}

/** Panel Çıkış — oturumu kapatır, /giris'e yönlendirir. */
export async function signOutDashboardAction(): Promise<void> {
  return signOutDashboardAndRedirect();
}

/** Giriş sayfasında «farklı hesap» — mevcut oturumu kapatır, formda kalır. */
export async function clearLoginSessionAction(): Promise<void> {
  await signOutDashboardSession();
  redirect("/giris");
}
