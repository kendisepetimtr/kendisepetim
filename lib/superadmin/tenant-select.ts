/** Süperadmin tenant listesi — owner_admin_pin_hash hariç. */
export const SUPERADMIN_TENANT_SELECT = `
  id,
  created_at,
  updated_at,
  business_name,
  subdomain,
  owner_name,
  email,
  phone,
  owner_user_id,
  logo_url,
  hours_day_mode,
  open_time,
  close_time,
  payment_cash,
  payment_door_card,
  payment_meal_card,
  plan,
  public_menu_enabled,
  dashboard_enabled,
  marketplace_enabled,
  owner_admin_pin_set_at
`;
