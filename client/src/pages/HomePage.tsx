import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/axios";
import type { BatchSummary, Paginated, SessionUser } from "../lib/api-types";
import { formatDateTime, formatMoney } from "../lib/format";
import { queryKeys } from "../utils/queryKeys";
import { FileUpload } from "../components/FileUpload";
import { useSession } from "../hooks/useSession";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function RecentBatches() {
  const batchesQuery = useQuery({
    queryKey: queryKeys.batches(1),
    queryFn: async () => {
      const response = await api.get<Paginated<BatchSummary>>("/api/upload/batches", {
        params: { page: 1, pageSize: 10 },
      });
      return response.data;
    },
  });

  const batches = batchesQuery.data?.data ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent imports</CardTitle>
        <CardDescription>Last 10 batches across your locations.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {batchesQuery.isError && (
          <p className="text-sm text-red-600">{batchesQuery.error.message}</p>
        )}
        {batches.length === 0 && !batchesQuery.isLoading && (
          <p className="text-sm text-muted-foreground">No imports yet.</p>
        )}
        {batches.map((batch) => (
          <div key={batch.id} className="space-y-1.5 rounded-md border p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-medium">{batch.fileName}</p>
              <Badge variant={batch.failedRows > 0 ? "destructive" : "secondary"}>
                {batch.importedRows}/{batch.totalRows} staged
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {batch.location.code} · {formatDateTime(batch.createdAt)} · by {batch.uploadedBy.name}
            </p>
            {(batch.failedRows > 0 || batch.duplicateRows > 0) && (
              <p className="text-xs text-muted-foreground">
                {batch.duplicateRows} duplicate(s), {batch.failedRows} failed validation
              </p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default function HomePage() {
  const { data: user } = useSession();
  if (!user) return null;
  return (
    <section className="grid gap-8 lg:grid-cols-[1.6fr_1fr] lg:items-start">
      <FileUpload locations={user.locations} canWrite={user.role !== "AUDITOR"} />
      <RecentBatches />
    </section>
  );
}
