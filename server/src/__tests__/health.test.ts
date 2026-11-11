import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../test/setup";

describe("GET /api/health", () => {
  it("returns health status", async () => {
    const response = await request(app).get("/api/health");
    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
    expect(typeof response.body.timestamp).toBe("string");
  });
});
