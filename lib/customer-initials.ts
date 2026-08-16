export function customerInitials(firstName: string, lastName = "", email: string | null = null): string {
  const a = firstName.trim().charAt(0);
  const b = lastName.trim().charAt(0);
  if (a && b) return `${a}${b}`.toLocaleUpperCase("tr");
  const parts = firstName.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toLocaleUpperCase("tr");
  }
  if (firstName.trim().length >= 2) return firstName.trim().slice(0, 2).toLocaleUpperCase("tr");
  if (a) return a.toLocaleUpperCase("tr");
  if (email) return email.charAt(0).toLocaleUpperCase("tr");
  return "KS";
}
