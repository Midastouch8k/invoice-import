import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../../test/setup";

describe("notFound", () => {
  it("returns 404 for unknown routes", async () => {
    const response = await request(app).get("/missing");
    expect(response.status).toBe(404);
    expect(response.body.message).toContain("Route not found");
  });
});
