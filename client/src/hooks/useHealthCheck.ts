import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/axios";
import type { HealthResponse } from "../lib/api-types";
import { queryKeys } from "../utils/queryKeys";

async function fetchHealth(): Promise<HealthResponse> {
  const response = await api.get<HealthResponse>("/api/health");
  return response.data;
}

export function useHealthCheck() {
  return useQuery({ queryKey: queryKeys.health, queryFn: fetchHealth });
}
