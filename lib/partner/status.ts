export type ApplicationStatus = "pending" | "approved" | "rejected";

export function parseApplicationStatus(raw: unknown): ApplicationStatus {
  if (raw === "pending" || raw === "rejected" || raw === "approved") return raw;
  return "approved";
}

export function isApplicationApproved(raw: unknown): boolean {
  return parseApplicationStatus(raw) === "approved";
}

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  pending: "Beklemede",
  approved: "Onaylı",
  rejected: "Reddedildi",
};
