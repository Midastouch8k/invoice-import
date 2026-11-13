import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import App from "../App";
import { setAuthToken, clearAuthToken } from "../lib/auth";

function renderApp() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  setAuthToken("test-token");
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("App", () => {
  it("renders the import workspace and navigates to health", async () => {
    renderApp();
    expect(await screen.findByText("Import invoices")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("link", { name: "Health" }));
    await waitFor(() => expect(screen.getByText("API connected ✅")).toBeInTheDocument());
  });

  it("shows the login page when signed out", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    localStorage_safe: void clearAuthToken();
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <App />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(await screen.findByText("Sign in to your franchise workspace")).toBeInTheDocument();
  });
});
