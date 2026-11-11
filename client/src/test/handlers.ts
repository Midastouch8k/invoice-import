import { rest } from "msw";

export const handlers = [
  rest.get("http://localhost:8080/api/health", (_req, res, ctx) =>
    res(ctx.json({ status: "ok", timestamp: "2024-01-01T00:00:00.000Z" })),
  ),
];
