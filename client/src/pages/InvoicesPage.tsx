import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/axios";
import type { InvoiceRow, Paginated } from "../lib/api-types";
import { formatDate, formatMoney } from "../lib/format";
import { queryKeys } from "../utils/queryKeys";
import { useSession } from "../hooks/useSession";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const PAGE_SIZE = 25;

export default function InvoicesPage() {
  const { data: user } = useSession();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<"ALL" | "APPROVED" | "VOID">("ALL");
  const [locationId, setLocationId] = useState("");

  const invoicesQuery = useQuery({
    queryKey: queryKeys.invoices({ page, pageSize: PAGE_SIZE, status, locationId }),
    queryFn: async () => {
      const response = await api.get<Paginated<InvoiceRow>>("/api/invoices", {
        params: { page, pageSize: PAGE_SIZE, status, ...(locationId ? { locationId } : {}) },
      });
      return response.data;
    },
    enabled: Boolean(user),
    placeholderData: (previous) => previous,
  });

  const rows = invoicesQuery.data?.data ?? [];
  const total = invoicesQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <section className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Invoice ledger</CardTitle>
              <CardDescription>Approved invoices across your locations.</CardDescription>
            </div>
            <div className="flex gap-2">
              <select
                value={locationId}
                onChange={(event) => {
                  setLocationId(event.target.value);
                  setPage(1);
                }}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">All locations</option>
                {(user?.locations ?? []).map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.code} — {location.name}
                  </option>
                ))}
              </select>
              <select
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value as typeof status);
                  setPage(1);
                }}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="ALL">All statuses</option>
                <option value="APPROVED">Approved</option>
                <option value="VOID">Void</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {invoicesQuery.isError && (
            <p className="rounded-md bg-red-50 p-3 text-sm font-medium text-red-600">
              {invoicesQuery.error.message}
            </p>
          )}

          {rows.length > 0 && (
            <div className="rounded-md border">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left text-muted-foreground">
                    <tr>
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
                        <td className="px-3 py-2.5 font-medium">{row.invoiceNumber}</td>
                        <td className="px-3 py-2.5">{row.vendor.name}</td>
                        <td className="px-3 py-2.5 text-muted-foreground">{row.location.code}</td>
                        <td className="px-3 py-2.5 tabular-nums">{formatMoney(row.amount)}</td>
                        <td className="px-3 py-2.5">{formatDate(row.date)}</td>
                        <td className="px-3 py-2.5">
                          <span
                            className={
                              row.status === "APPROVED"
                                ? "rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700"
                                : "rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600"
                            }
                          >
                            {row.status.charAt(0) + row.status.slice(1).toLowerCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {total === 0 && !invoicesQuery.isLoading && !invoicesQuery.isError && (
            <p className="text-sm text-muted-foreground">No invoices found for these filters.</p>
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
    </section>
  );
}
