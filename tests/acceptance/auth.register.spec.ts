import request from "supertest";
import { describe, it, expect } from "vitest";
import app from "../../backend/app.js";

function uniqueEmail() {
  const n = Date.now() + Math.floor(Math.random() * 1e6);
  return `user_${n}@example.com`;
}

describe("POST /api/auth/register", () => {
  it("creates user and returns 201 with userId", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: uniqueEmail(), password: "Secret123!" })
      .set("accept", "application/json");

    expect(res.status).toBe(201);
    expect(res.body).toBeTypeOf("object");
    expect(res.body.userId).toBeTypeOf("string");
    expect(res.body.userId.length).toBeGreaterThan(0);
  });

  it("rejects invalid payload with unified error", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "not-an-email", password: "short" });

    expect(res.status).toBe(400);
    expect(res.body?.error?.code).toBeDefined();
    expect(res.body?.error?.message).toBeDefined();
  });
});
