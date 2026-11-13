import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Activity, LogIn } from "lucide-react";
import { api } from "../lib/axios";
import { setAuthToken } from "../lib/auth";
import type { LoginResponse, SessionUser } from "../lib/api-types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type LoginPageProps = {
  onSuccess: (user: SessionUser) => void;
};

export default function LoginPage({ onSuccess }: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const loginMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post<LoginResponse>("/api/auth/login", {
        email,
        password,
      });
      return response.data;
    },
    onSuccess: (data) => {
      setAuthToken(data.token);
      onSuccess(data.user);
    },
  });

  const canSubmit = email.trim() !== "" && password !== "" && !loginMutation.isPending;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Activity className="h-5 w-5 text-primary" />
          </div>
          <CardTitle className="text-xl">Invoice Import</CardTitle>
          <CardDescription>Sign in to your franchise workspace</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (canSubmit) loginMutation.mutate();
            }}
          >
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium text-foreground">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="you@company.com"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium text-foreground">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="••••••••"
              />
            </div>
            {loginMutation.isError && (
              <p className="rounded-md bg-red-50 p-3 text-sm font-medium text-red-600">
                {loginMutation.error.message}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={!canSubmit}>
              {loginMutation.isPending ? (
                "Signing in..."
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  Sign in
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
