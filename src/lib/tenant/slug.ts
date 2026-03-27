export function normalizeTenantSlug(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidTenantSlug(value: string): boolean {
  return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(value);
}
