import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { errorHandler } from "../../middleware/errorHandler";

describe("errorHandler", () => {
  it("returns a normalized error response", async () => {
    const app = express();
    app.get("/boom", (_req, _res, next) => next(new Error("Boom")));
    app.use(errorHandler);
    const response = await request(app).get("/boom");
    expect(response.status).toBe(500);
    expect(response.body.message).toBe("Boom");
  });
});
