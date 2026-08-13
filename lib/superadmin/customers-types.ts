export type SuperadminCustomer = {
  userId: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  createdAt: string;
  updatedAt: string;
  blockedAt: string | null;
  blockedReason: string;
  adminNote: string;
  orderCount: number;
  addressCount: number;
};

export function customerDisplayName(c: SuperadminCustomer): string {
  const name = `${c.firstName} ${c.lastName}`.trim();
  return name || "Müşteri";
}
