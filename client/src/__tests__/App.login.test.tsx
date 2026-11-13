import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import App from "../App";

/**
 * Regression test: signing in from the login screen must transition to the
 * workspace without crashing. This guards against Rules-of-Hooks violations
 * in App, which mounts signed-out and re-renders with a token after login.
 */
describe("App login transition", () => {
  it("transitions from login to the workspace after signing in", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <App />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByText("Sign in to your franchise workspace")).toBeInTheDocument();

    // The MSW handler returns a valid token + session user, driving the real
    // login flow: setAuthToken -> query cache -> App re-renders with token.
    await userEvent.type(screen.getByLabelText("Email"), "michael.tucker@meridianfg.com");
    await userEvent.type(screen.getByLabelText("Password"), "Password123!");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByText("Import invoices")).toBeInTheDocument();
  });
});
