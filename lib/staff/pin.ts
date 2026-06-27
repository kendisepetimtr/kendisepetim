/** Personel PIN hash/dogrulama — admin, garson ve kasa icin ortak. */
export {
  hashOwnerAdminPin as hashStaffPin,
  isValidOwnerAdminPin as isValidStaffPin,
  verifyOwnerAdminPin as verifyStaffPin,
} from "@/lib/owner-admin/pin";

export type StaffPinRole = "admin" | "waiter" | "cashier";
