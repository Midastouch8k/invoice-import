import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/axios";
import { queryKeys } from "../utils/queryKeys";

type HealthResponse = { status: "ok"; timestamp: string };

async function fetchHealth(): Promise<HealthResponse> {
  const response = await api.get<HealthResponse>("/api/health");
  return response.data;
}

export function useHealthCheck() {
  return useQuery({ queryKey: queryKeys.health, queryFn: fetchHealth });
}
