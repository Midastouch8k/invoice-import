export function formatMoney(value: number | string | null | undefined): string {
  const numeric = typeof value === "string" ? Number(value) : value;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    typeof numeric === "number" && Number.isFinite(numeric) ? numeric : 0,
  );
}

/** Invoice dates are stored as calendar dates (UTC midnight) — format in UTC. */
export function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-US", { timeZone: "UTC" });
}

export function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("en-US", { dateStyle: "short", timeStyle: "short" });
}

export const roleLabels: Record<string, string> = {
  HQ_ADMIN: "HQ Admin",
  REGIONAL_MANAGER: "Regional Manager",
  FRANCHISEE: "Franchisee",
  AP_CLERK: "AP Clerk",
  AUDITOR: "Auditor",
};
