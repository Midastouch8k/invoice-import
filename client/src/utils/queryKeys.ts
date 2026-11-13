export const queryKeys = {
  health: ["health"] as const,
  session: ["session"] as const,
  staging: (params: { page: number; pageSize: number; status: string }) =>
    ["staging", params] as const,
  batches: (page: number) => ["batches", page] as const,
  invoices: (params: { page: number; pageSize: number; status: string; locationId: string }) =>
    ["invoices", params] as const,
};
