export function normalizeDevelopmentHostname(hostHeader: string): string {
  return hostHeader.split(":")[0].trim().toLowerCase();
}
