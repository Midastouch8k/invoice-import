export type Role =
  | "HQ_ADMIN"
  | "REGIONAL_MANAGER"
  | "FRANCHISEE"
  | "AP_CLERK"
  | "AUDITOR";

export type LocationSummary = { id: string; code: string; name: string };

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  organization: { id: string; name: string };
  locations: LocationSummary[];
};

export type LoginResponse = { token: string; user: SessionUser };

export type StagingStatus = "PENDING" | "APPROVED" | "REJECTED";

export type StagingRow = {
  id: string;
  invoiceNumber: string;
  vendorName: string | null;
  vendorEmail: string | null;
  amount: number;
  date: string;
  status: StagingStatus;
  rejectReason: string | null;
  batchId: string;
  createdAt: string;
  location: LocationSummary;
};

export type RowFailure = { row: number; error: string };

export type UploadResult = {
  message: string;
  batchId: string;
  totalRows: number;
  importedRows: number;
  duplicateRows: number;
  failedRows: number;
  failures: RowFailure[];
};

export type BatchSummary = {
  id: string;
  fileName: string;
  status: "PROCESSING" | "COMPLETED" | "FAILED";
  totalRows: number;
  importedRows: number;
  duplicateRows: number;
  failedRows: number;
  failures: RowFailure[] | null;
  createdAt: string;
  location: LocationSummary;
  uploadedBy: { id: string; name: string };
};

export type InvoiceStatus = "APPROVED" | "VOID";

export type InvoiceRow = {
  id: string;
  invoiceNumber: string;
  amount: number;
  date: string;
  vendorEmail: string | null;
  status: InvoiceStatus;
  batchId: string | null;
  createdAt: string;
  vendor: { id: string; name: string };
  location: LocationSummary;
};

export type Paginated<T> = { data: T[]; page: number; pageSize: number; total: number };

export type HealthResponse = { status: "ok"; db: "up" | "down"; timestamp: string };
