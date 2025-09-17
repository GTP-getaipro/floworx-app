import request from "supertest";
import { describe, it, expect } from "vitest";
import app from "../../backend/app"; // CommonJS export

function uid() {
  return "user_" + Date.now() + "_" + Math.floor(Math.random() * 1e6);
}

async function register(email: string, password: string) {
  const res = await request(app)
    .post("/api/auth/register")
    .send({ email, password })
    .set("accept", "application/json");
  expect([200, 201, 202]).toContain(res.status);
  return res.body?.userId;
}

describe("POST /api/auth/login", () => {
  it("blocks unverified users with 409 and resendUrl", async () => {
    const email = `${uid()}@example.com`;
    const password = "Secret123!";

    await register(email, password);

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email, password });

    expect(res.status).toBe(409);
    expect(res.body?.error?.code).toBe("UNVERIFIED");
    expect(typeof res.body?.error?.resendUrl).toBe("string");
  });

  it("allows verified users to login (200 with userId)", async () => {
    const email = `${uid()}@example.com`;
    const password = "Secret123!";

    await register(email, password);

    // TEST-ONLY helper to mark verified; mounted only in NODE_ENV==='test'
    const mark = await request(app)
      .post("/api/auth/mark-verified")
      .send({ email });
    expect([200, 204]).toContain(mark.status);

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email, password });

    expect(res.status).toBe(200);
    expect(typeof res.body?.userId).toBe("string");
    expect(res.body.userId.length).toBeGreaterThan(0);
  });

  it("rejects invalid credentials with 401", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "nobody@example.com", password: "WrongPass123!" });

    expect(res.status).toBe(401);
    expect(res.body?.error?.code).toBe("INVALID_CREDENTIALS");
  });
});
