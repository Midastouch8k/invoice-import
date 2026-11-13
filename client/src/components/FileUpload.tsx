import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { api } from "../lib/axios";
import type {
  LocationSummary,
  Paginated,
  StagingRow,
  UploadResult,
} from "../lib/api-types";
import { formatDate, formatMoney } from "../lib/format";
import { queryKeys } from "../utils/queryKeys";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type FileUploadProps = {
  locations: LocationSummary[];
  canWrite: boolean;
};

const PAGE_SIZE = 25;

export function FileUpload({ locations, canWrite }: FileUploadProps) {
  const queryClient = useQueryClient();
  const [locationId, setLocationId] = useState(() => locations[0]?.id ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [statusFilter, setStatusFilter] = useState<"PENDING" | "APPROVED" | "REJECTED" | "ALL">(
    "PENDING",
  );
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [lastUpload, setLastUpload] = useState<UploadResult | null>(null);

  const invalidateImportData = () => {
    void queryClient.invalidateQueries({ queryKey: ["staging"] });
    void queryClient.invalidateQueries({ queryKey: ["batches"] });
    void queryClient.invalidateQueries({ queryKey: ["invoices"] });
  };

  const uploadMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append("file", file!);
      formData.append("locationId", locationId);
      const response = await api.post<UploadResult>("/api/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data;
    },
    onSuccess: (data) => {
      setLastUpload(data);
      setFile(null);
      setStatusFilter("PENDING");
      setPage(1);
      setSelectedIds(new Set());
      invalidateImportData();
    },
  });

  const stagingQuery = useQuery({
    queryKey: queryKeys.staging({ page, pageSize: PAGE_SIZE, status: statusFilter }),
    queryFn: async () => {
      const response = await api.get<Paginated<StagingRow>>("/api/upload/staging", {
        params: { page, pageSize: PAGE_SIZE, status: statusFilter },
      });
      return response.data;
    },
    placeholderData: (previous) => previous,
  });

  const approveMutation = useMutation({
    mutationFn: async (ids?: string[]) => {
      const response = await api.post<{ message: string; approved: number; duplicates: number }>(
        "/api/upload/approve",
        ids ? { ids } : {},
      );
      return response.data;
    },
    onSuccess: () => {
      setSelectedIds(new Set());
      invalidateImportData();
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const response = await api.post<{ message: string; rejected: number }>(
        "/api/upload/staging/reject",
        { ids, reason: rejectReason },
      );
      return response.data;
    },
    onSuccess: () => {
      setSelectedIds(new Set());
      setRejectReason("");
      setShowRejectInput(false);
      invalidateImportData();
    },
  });

  const rows = stagingQuery.data?.data ?? [];
  const total = stagingQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const selectableRows = canWrite && statusFilter === "PENDING" ? rows : [];
  const allSelected = selectableRows.length > 0 && selectableRows.every((row) => selectedIds.has(row.id));
  const selectedCount = selectedIds.size;

  const toggleRow = (id: string) => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelectedIds((_previous) => {
      if (allSelected) return new Set();
      return new Set(selectableRows.map((row) => row.id));
    });
  };

  return (
    <div className="space-y-6">
      {/* Import card */}
      <Card>
        <CardHeader>
          <CardTitle>Import invoices</CardTitle>
          <CardDescription>
            Upload a vendor CSV. Rows land in staging for review before they enter the ledger.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-foreground">Location</span>
              <select
                value={locationId}
                onChange={(event) => setLocationId(event.target.value)}
                disabled={locations.length <= 1}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              >
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.code} — {location.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-foreground">CSV file</span>
              <input
                type="file"
                accept=".csv"
                disabled={!canWrite}
                onChange={(event) => {
                  const selected = event.target.files?.[0];
                  if (selected) {
                    setFile(selected);
                    setLastUpload(null);
                  }
                }}
                className="block h-10 w-full cursor-pointer rounded-md border border-input bg-background px-3 py-1.5 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-primary-foreground hover:file:bg-primary/90"
              />
            </label>
          </div>

          {canWrite ? (
            <Button
              onClick={() => uploadMutation.mutate()}
              disabled={!file || !locationId || uploadMutation.isPending}
            >
              {uploadMutation.isPending ? "Uploading..." : "Upload & stage"}
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">
              Your role has read-only access. Contact an administrator to import invoices.
            </p>
          )}

          {uploadMutation.isError && (
            <p className="rounded-md bg-red-50 p-3 text-sm font-medium text-red-600">
              {uploadMutation.error.message}
            </p>
          )}

          {lastUpload && (
            <div className="space-y-3 rounded-md border bg-secondary/40 p-4">
              <p className="flex items-start gap-2 text-sm font-medium">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                {lastUpload.message}
              </p>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-green-100 px-2.5 py-1 font-medium text-green-700">
                  {lastUpload.importedRows} imported
                </span>
                <span className="rounded-full bg-amber-100 px-2.5 py-1 font-medium text-amber-700">
                  {lastUpload.duplicateRows} duplicates skipped
                </span>
                <span className="rounded-full bg-red-100 px-2.5 py-1 font-medium text-red-700">
                  {lastUpload.failedRows} failed validation
                </span>
              </div>
              {lastUpload.failures.length > 0 && (
                <div className="space-y-1 rounded-md bg-red-50 p-3">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-red-700">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Row errors
                  </p>
                  <ul className="space-y-0.5 text-xs text-red-600">
                    {lastUpload.failures.map((failure) => (
                      <li key={`${failure.row}-${failure.error}`}>
                        Row {failure.row}: {failure.error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review card */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Review data {total > 0 && `(${total} rows)`}</CardTitle>
              <CardDescription>Validate rows before they enter the invoice ledger.</CardDescription>
            </div>
            <select
              value={statusFilter}
              onChange={(event) => {
                const next = event.target.value as typeof statusFilter;
                setStatusFilter(next);
                setPage(1);
                setSelectedIds(new Set());
              }}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="PENDING">Pending</option>
              <option value="ALL">All statuses</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {stagingQuery.isError && (
            <p className="rounded-md bg-red-50 p-3 text-sm font-medium text-red-600">
              {stagingQuery.error.message}
            </p>
          )}

          {rows.length > 0 && (
            <div className="rounded-md border">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left text-muted-foreground">
                    <tr>
                      {selectableRows.length > 0 && (
                        <th className="w-10 px-3 py-2.5">
                          <input
                            type="checkbox"
                            checked={allSelected}
                            onChange={toggleAll}
                            aria-label="Select all rows"
                            className="h-4 w-4 cursor-pointer"
                          />
                        </th>
                      )}
                      <th className="px-3 py-2.5 font-medium">Invoice #</th>
                      <th className="px-3 py-2.5 font-medium">Vendor</th>
                      <th className="px-3 py-2.5 font-medium">Location</th>
                      <th className="px-3 py-2.5 font-medium">Amount</th>
                      <th className="px-3 py-2.5 font-medium">Date</th>
                      <th className="px-3 py-2.5 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {rows.map((row) => (
                      <tr key={row.id} className="transition-colors hover:bg-muted/40">
                        {selectableRows.length > 0 && (
                          <td className="px-3 py-2.5">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(row.id)}
                              onChange={() => toggleRow(row.id)}
                              aria-label={`Select ${row.invoiceNumber}`}
                              className="h-4 w-4 cursor-pointer"
                            />
                          </td>
                        )}
                        <td className="px-3 py-2.5 font-medium">{row.invoiceNumber}</td>
                        <td className="px-3 py-2.5">{row.vendorName ?? "—"}</td>
                        <td className="px-3 py-2.5 text-muted-foreground">{row.location.code}</td>
                        <td className="px-3 py-2.5 tabular-nums">{formatMoney(row.amount)}</td>
                        <td className="px-3 py-2.5">{formatDate(row.date)}</td>
                        <td className="px-3 py-2.5">
                          <span
                            className={
                              row.status === "PENDING"
                                ? "rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700"
                                : row.status === "APPROVED"
                                  ? "rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700"
                                  : "rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700"
                            }
                          >
                            {row.status.charAt(0) + row.status.slice(1).toLowerCase()}
                          </span>
                          {row.rejectReason && (
                            <span className="ml-1.5 text-xs text-muted-foreground">
                              {row.rejectReason}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {total === 0 && !stagingQuery.isLoading && !stagingQuery.isError && (
            <p className="text-sm text-muted-foreground">
              No {statusFilter === "ALL" ? "" : statusFilter.toLowerCase() + " "}rows to show.
            </p>
          )}

          {canWrite && selectedCount > 0 && (
            <div className="flex flex-wrap items-center gap-3 rounded-md border bg-secondary/40 p-3">
              <span className="text-sm font-medium">{selectedCount} selected</span>
              <Button
                size="sm"
                onClick={() => approveMutation.mutate([...selectedIds])}
                disabled={approveMutation.isPending}
              >
                {approveMutation.isPending ? "Approving..." : "Approve selected"}
              </Button>
              {showRejectInput ? (
                <>
                  <input
                    value={rejectReason}
                    onChange={(event) => setRejectReason(event.target.value)}
                    placeholder="Rejection reason"
                    className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <Button
                    size="sm"
                    className="bg-red-600 text-white hover:bg-red-700"
                    onClick={() => rejectMutation.mutate([...selectedIds])}
                    disabled={rejectMutation.isPending || rejectReason.trim() === ""}
                  >
                    {rejectMutation.isPending ? "Rejecting..." : "Confirm reject"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowRejectInput(false)}>
                    Cancel
                  </Button>
                </>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setShowRejectInput(true)}>
                  Reject selected
                </Button>
              )}
            </div>
          )}

          {canWrite && statusFilter === "PENDING" && selectedCount === 0 && total > 0 && (
            <div className="flex items-center justify-between">
              <Button
                onClick={() => approveMutation.mutate(undefined)}
                disabled={approveMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                {approveMutation.isPending ? "Approving..." : "Approve all pending"}
              </Button>
            </div>
          )}

          {(approveMutation.isError || rejectMutation.isError) && (
            <p className="rounded-md bg-red-50 p-3 text-sm font-medium text-red-600">
              {(approveMutation.error ?? rejectMutation.error)?.message}
            </p>
          )}
          {(approveMutation.isSuccess || rejectMutation.isSuccess) && (
            <p className="rounded-md bg-green-50 p-3 text-sm font-medium text-green-600">
              {(approveMutation.data ?? rejectMutation.data)?.message}
            </p>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page <= 1}
              >
                Previous
              </Button>
              <span>
                Page {page} of {totalPages}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={page >= totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
