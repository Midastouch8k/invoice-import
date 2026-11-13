import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, Navigate, Route, Routes } from "react-router-dom";
import { LogOut } from "lucide-react";
import HomePage from "./pages/HomePage";
import InvoicesPage from "./pages/InvoicesPage";
import HealthPage from "./pages/HealthPage";
import LoginPage from "./pages/LoginPage";
import { useSession } from "./hooks/useSession";
import { clearAuthToken, getAuthToken } from "./lib/auth";
import type { SessionUser } from "./lib/api-types";
import { roleLabels } from "./lib/format";
import { routes } from "./constants";
import { queryKeys } from "./utils/queryKeys";
import { Button } from "@/components/ui/button";

export default function App() {
  const [token, setToken] = useState<string | null>(() => getAuthToken());
  const queryClient = useQueryClient();
  const session = useSession();

  // Signed out — or the stored token turned out to be expired/invalid.
  // Derived during render (not reset in an effect) so hooks always run in
  // the same order and no cascading setState happens. A 401 anywhere also
  // purges the dead token via the axios interceptor in lib/axios.ts.
  if (!token || session.isError) {
    return (
      <LoginPage
        onSuccess={(user: SessionUser) => {
          queryClient.setQueryData(queryKeys.session, user);
          setToken(getAuthToken());
        }}
      />
    );
  }

  if (session.isLoading || !session.data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading workspace...</p>
      </div>
    );
  }

  const user = session.data;

  const signOut = () => {
    clearAuthToken();
    queryClient.clear();
    setToken(null);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="border-b bg-card/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-6">
            <Link className="text-sm font-semibold" to={routes.home}>
              Invoice Import
            </Link>
            <Link
              to={routes.home}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Import
            </Link>
            <Link
              to={routes.invoices}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Invoices
            </Link>
            <Link
              to={routes.health}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Health
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium leading-tight">{user.name}</p>
              <p className="text-xs text-muted-foreground">
                {roleLabels[user.role] ?? user.role} · {user.organization.name}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-6xl p-6">
        <Routes>
          <Route path={routes.home} element={<HomePage />} />
          <Route path={routes.invoices} element={<InvoicesPage />} />
          <Route path={routes.health} element={<HealthPage />} />
          <Route path="*" element={<Navigate to={routes.home} replace />} />
        </Routes>
      </main>
    </div>
  );
}
