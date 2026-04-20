export function normalizeGoogleMapsUrl(input: string): string {
  return input.trim();
}

export function isValidGoogleMapsUrl(input: string): boolean {
  const value = normalizeGoogleMapsUrl(input);
  if (!value) return true;

  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    if (url.protocol !== "https:") return false;
    return host.includes("google.") || host.endsWith("goo.gl");
  } catch {
    return false;
  }
}
