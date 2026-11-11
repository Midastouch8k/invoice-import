import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { rest } from "msw";
import { describe, expect, it } from "vitest";
import HealthPage from "../../pages/HealthPage";
import { server } from "../../test/server";

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <HealthPage />
    </QueryClientProvider>,
  );
}

describe("HealthPage", () => {
  it("renders connected when health succeeds", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("API connected ✅")).toBeInTheDocument());
  });

  it("renders unavailable when health fails", async () => {
    server.use(rest.get("http://localhost:8080/api/health", (_req, res) => res.networkError("offline")));
    renderPage();
    await waitFor(() => expect(screen.getByText("API unavailable ❌")).toBeInTheDocument());
  });
});
