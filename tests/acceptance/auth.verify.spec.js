const request = require("supertest");
const { app } = require("../../backend/server");
const { databaseOperations } = require("../../backend/database/database-operations");
const emailService = require("../../backend/services/emailService");

const uid = () => Math.random().toString(36).substring(2, 15);

async function register(email, password) {
  const res = await request(app)
    .post("/api/auth/register")
    .send({
      email,
      password,
      firstName: "Test",
      lastName: "User",
      businessName: "Test Business",
      agreeToTerms: true
    });
  
  if (res.status !== 201) {
    throw new Error(`Registration failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  
  return res.body.user;
}

describe("Email Verification Flow", () => {
  let testUser;
  let testEmail;
  let validToken;

  beforeAll(async () => {
    testEmail = `test-verify-${uid()}@example.com`;
    testUser = await register(testEmail, "TestPassword123!");
    
    // Generate a valid token for testing
    validToken = emailService.generateVerificationToken();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    await databaseOperations.createEmailVerificationToken(
      testUser.id,
      validToken,
      expiresAt.toISOString()
    );
  });

  afterAll(async () => {
    // Cleanup test data
    if (testUser?.id) {
      try {
        await databaseOperations.deleteUser(testUser.id);
      } catch (error) {
        console.warn("Cleanup failed:", error);
      }
    }
  });

  describe("POST /api/auth/resend", () => {
    it("returns 202 always for valid email", async () => {
      const res = await request(app)
        .post("/api/auth/resend")
        .send({ email: testEmail });

      expect(res.status).toBe(202);
      expect(res.body.message).toContain("If this email is registered");
    });

    it("returns 202 always for non-existent email (security)", async () => {
      const res = await request(app)
        .post("/api/auth/resend")
        .send({ email: "nonexistent@example.com" });

      expect(res.status).toBe(202);
      expect(res.body.message).toContain("If this email is registered");
    });

    it("throttles requests (1/min per user)", async () => {
      // First request
      const res1 = await request(app)
        .post("/api/auth/resend")
        .send({ email: testEmail });
      expect(res1.status).toBe(202);

      // Second request immediately after should be throttled
      const res2 = await request(app)
        .post("/api/auth/resend")
        .send({ email: testEmail });
      expect(res2.status).toBe(429);
      expect(res2.body.error.code).toBe("THROTTLED");
    });

    it("requires email field", async () => {
      const res = await request(app)
        .post("/api/auth/resend")
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("MISSING_EMAIL");
    });
  });

  describe("POST /api/auth/verify", () => {
    it("verifies email with valid token (200)", async () => {
      const res = await request(app)
        .post("/api/auth/verify")
        .send({ token: validToken });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Email verified successfully");

      // Verify user is now marked as verified
      const userResult = await databaseOperations.getUserById(testUser.id);
      expect(userResult.data.email_verified).toBe(true);
    });

    it("rejects invalid token (401)", async () => {
      const res = await request(app)
        .post("/api/auth/verify")
        .send({ token: "invalid-token-123" });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("INVALID_TOKEN");
    });

    it("rejects expired token (410)", async () => {
      // Create an expired token
      const expiredToken = emailService.generateVerificationToken();
      const expiredDate = new Date(Date.now() - 60 * 1000); // 1 minute ago
      
      await databaseOperations.createEmailVerificationToken(
        testUser.id,
        expiredToken,
        expiredDate.toISOString()
      );

      const res = await request(app)
        .post("/api/auth/verify")
        .send({ token: expiredToken });

      expect(res.status).toBe(410);
      expect(res.body.error.code).toBe("EXPIRED_TOKEN");
    });

    it("rejects reused token (single-use)", async () => {
      // Create a fresh token
      const freshToken = emailService.generateVerificationToken();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
      
      await databaseOperations.createEmailVerificationToken(
        testUser.id,
        freshToken,
        expiresAt.toISOString()
      );

      // First use should succeed
      const res1 = await request(app)
        .post("/api/auth/verify")
        .send({ token: freshToken });
      expect(res1.status).toBe(200);

      // Second use should fail (token deleted after first use)
      const res2 = await request(app)
        .post("/api/auth/verify")
        .send({ token: freshToken });
      expect(res2.status).toBe(401);
      expect(res2.body.error.code).toBe("INVALID_TOKEN");
    });

    it("requires token field", async () => {
      const res = await request(app)
        .post("/api/auth/verify")
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("MISSING_TOKEN");
    });
  });

  describe("Integration with login flow", () => {
    it("login should succeed after email verification", async () => {
      // Create a new user for this test
      const newEmail = `login-test-${uid()}@example.com`;
      const password = "TestPassword123!";
      const newUser = await register(newEmail, password);

      // Initially login should fail with 409 UNVERIFIED
      const loginRes1 = await request(app)
        .post("/api/auth/login")
        .send({ email: newEmail, password });
      
      expect(loginRes1.status).toBe(409);
      expect(loginRes1.body.error.code).toBe("UNVERIFIED");

      // Verify the email
      const verifyToken = emailService.generateVerificationToken();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
      
      await databaseOperations.createEmailVerificationToken(
        newUser.id,
        verifyToken,
        expiresAt.toISOString()
      );

      const verifyRes = await request(app)
        .post("/api/auth/verify")
        .send({ token: verifyToken });
      expect(verifyRes.status).toBe(200);

      // Now login should succeed with 200
      const loginRes2 = await request(app)
        .post("/api/auth/login")
        .send({ email: newEmail, password });
      
      expect(loginRes2.status).toBe(200);
      expect(typeof loginRes2.body.userId).toBe("string");
      expect(loginRes2.body.userId.length).toBeGreaterThan(0);

      // Cleanup
      try {
        await databaseOperations.deleteUser(newUser.id);
      } catch (error) {
        console.warn("Cleanup failed:", error);
      }
    });
  });
});
