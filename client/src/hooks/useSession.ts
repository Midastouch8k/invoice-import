import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/axios";
import { getAuthToken } from "../lib/auth";
import type { SessionUser } from "../lib/api-types";
import { queryKeys } from "../utils/queryKeys";

async function fetchSession(): Promise<SessionUser> {
  const response = await api.get<SessionUser>("/api/auth/me");
  return response.data;
}

export function useSession() {
  const token = getAuthToken();
  return useQuery({
    queryKey: queryKeys.session,
    queryFn: fetchSession,
    enabled: Boolean(token),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}
