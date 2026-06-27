export type CourierRow = {
  id: string;
  created_at: string;
  updated_at: string;
  tenant_id: string;
  first_name: string;
  last_name: string;
  phone: string;
  is_active: boolean;
};

export type CourierInsert = Omit<CourierRow, "id" | "created_at" | "updated_at"> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export function courierDisplayName(courier: Pick<CourierRow, "first_name" | "last_name">): string {
  return `${courier.first_name} ${courier.last_name}`.trim();
}
