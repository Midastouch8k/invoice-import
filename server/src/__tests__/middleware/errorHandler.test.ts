import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { errorHandler } from "../../middleware/errorHandler";
import { ApiError } from "../../utils/errors";

describe("errorHandler", () => {
  it("hides internal error details from clients", async () => {
    const app = express();
    app.get("/boom", (_req, _res, next) => next(new Error("Boom")));
    app.use(errorHandler);
    const response = await request(app).get("/boom");
    expect(response.status).toBe(500);
    expect(response.body.message).toBe("Internal server error");
  });

  it("passes through ApiError status and message", async () => {
    const app = express();
    app.get("/bad", (_req, _res, next) => next(ApiError.badRequest("Location is required")));
    app.use(errorHandler);
    const response = await request(app).get("/bad");
    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Location is required");
  });
});
