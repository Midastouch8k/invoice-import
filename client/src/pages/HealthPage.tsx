import { Activity, CircleCheck, CircleX, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useHealthCheck } from "../hooks/useHealthCheck";

export default function HealthPage() {
  const { data, isLoading, isError } = useHealthCheck();
  const connected = data?.status === "ok" && !isLoading && !isError;
  const statusText = isLoading ? "Checking API..." : connected ? "API connected ✅" : "API unavailable ❌";

  return (
    <section className="max-w-2xl">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                API health
              </CardTitle>
              <CardDescription>Checks the Express endpoint at /api/health.</CardDescription>
            </div>
            <Badge variant={connected ? "default" : "destructive"}>
              {isLoading ? "Checking" : connected ? "Online" : "Offline"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 rounded-md border bg-secondary/40 p-4">
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : connected ? (
              <CircleCheck className="h-5 w-5 text-primary" />
            ) : (
              <CircleX className="h-5 w-5 text-destructive" />
            )}
            <p className="font-medium">{statusText}</p>
          </div>
          {connected && (
            <p className="text-sm text-muted-foreground">
              Last response timestamp: <span className="font-medium text-foreground">{data.timestamp}</span>
            </p>
          )}
          {isError && (
            <p className="text-sm text-muted-foreground">
              Start the server with <span className="font-medium text-foreground">bun run dev</span> in
              the server directory and refresh this page.
            </p>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
