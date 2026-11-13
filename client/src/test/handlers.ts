import { rest } from "msw";

export const sessionUser = {
  id: "user-1",
  email: "admin@demo.com",
  name: "Avery Admin",
  role: "HQ_ADMIN",
  organization: { id: "org-1", name: "Demo Franchise Co." },
  locations: [
    { id: "loc-1", code: "ST-001", name: "Downtown Store" },
    { id: "loc-2", code: "ST-002", name: "Riverside Store" },
  ],
};

export const handlers = [
  rest.get("http://localhost:8080/api/health", (_req, res, ctx) =>
    res(ctx.json({ status: "ok", db: "up", timestamp: "2024-01-01T00:00:00.000Z" })),
  ),
  rest.post("http://localhost:8080/api/auth/login", (_req, res, ctx) =>
    res(ctx.json({ token: "test-token", user: sessionUser })),
  ),
  rest.get("http://localhost:8080/api/auth/me", (_req, res, ctx) =>
    res(ctx.json(sessionUser)),
  ),
  rest.get("http://localhost:8080/api/upload/staging", (_req, res, ctx) =>
    res(ctx.json({ data: [], page: 1, pageSize: 25, total: 0 })),
  ),
  rest.get("http://localhost:8080/api/upload/batches", (_req, res, ctx) =>
    res(ctx.json({ data: [], page: 1, pageSize: 10, total: 0 })),
  ),
  rest.get("http://localhost:8080/api/invoices", (_req, res, ctx) =>
    res(ctx.json({ data: [], page: 1, pageSize: 25, total: 0 })),
  ),
];
