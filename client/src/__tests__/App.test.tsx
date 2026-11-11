import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import App from "../App";
import { queryClient } from "../lib/queryClient";

describe("App", () => {
  it("renders home and navigates to health", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <App />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(screen.getByRole("heading", { name: "my-pern-app" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("link", { name: "Health" }));
    await waitFor(() => expect(screen.getByText("API connected ✅")).toBeInTheDocument());
  });
});
