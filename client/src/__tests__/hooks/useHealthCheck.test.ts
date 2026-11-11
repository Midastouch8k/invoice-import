import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { rest } from "msw";
import { createElement } from "react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { useHealthCheck } from "../../hooks/useHealthCheck";
import { server } from "../../test/server";

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return createElement(QueryClientProvider, { client }, children);
}

describe("useHealthCheck", () => {
  it("returns loading state", () => {
    const { result } = renderHook(() => useHealthCheck(), { wrapper });
    expect(result.current.isLoading).toBe(true);
  });

  it("returns success state", async () => {
    const { result } = renderHook(() => useHealthCheck(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("returns error state", async () => {
    server.use(rest.get("http://localhost:8080/api/health", (_req, res) => res.networkError("offline")));
    const { result } = renderHook(() => useHealthCheck(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
