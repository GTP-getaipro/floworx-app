import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../backend/server';

describe('Email Verification Flow', () => {
  const testUser = {
    email: 'test-verify@example.com',
    password: 'TestPassword123!',
    firstName: 'Test',
    lastName: 'User'
  };

  beforeEach(async () => {
    // Clean up any existing test user
    try {
      await request(app)
        .delete('/api/test/cleanup-user')
        .send({ email: testUser.email });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  it('should complete full email verification flow: register → resend → verify → login', async () => {
    // Step 1: Register user
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send(testUser)
      .expect(201);

    expect(registerResponse.body).toHaveProperty('success', true);
    expect(registerResponse.body).toHaveProperty('userId');

    // Step 2: Try to login (should fail with 409 - unverified)
    const loginAttempt1 = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password
      })
      .expect(409);

    expect(loginAttempt1.body).toHaveProperty('error');
    expect(loginAttempt1.body.error.code).toBe('UNVERIFIED');
    expect(loginAttempt1.body).toHaveProperty('resendUrl', '/api/auth/resend');

    // Step 3: Resend verification email
    const resendResponse = await request(app)
      .post('/api/auth/resend')
      .send({ email: testUser.email })
      .expect(202);

    expect(resendResponse.body).toHaveProperty('message');

    // Step 4: Get verification token using test helper
    const tokenResponse = await request(app)
      .get(`/api/test/last-verification-token?email=${testUser.email}`)
      .expect(200);

    expect(tokenResponse.body).toHaveProperty('token');
    const verificationToken = tokenResponse.body.token;

    // Step 5: Verify email with token
    const verifyResponse = await request(app)
      .post('/api/auth/verify')
      .send({ token: verificationToken })
      .expect(200);

    expect(verifyResponse.body).toHaveProperty('success', true);
    expect(verifyResponse.body).toHaveProperty('message');

    // Step 6: Login should now work
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password
      })
      .expect(200);

    expect(loginResponse.body).toHaveProperty('userId');
  });

  it('should handle resend throttling (max 1/min per user)', async () => {
    // Register user first
    await request(app)
      .post('/api/auth/register')
      .send(testUser)
      .expect(201);

    // First resend should work
    await request(app)
      .post('/api/auth/resend')
      .send({ email: testUser.email })
      .expect(202);

    // Second resend immediately should be throttled
    const throttledResponse = await request(app)
      .post('/api/auth/resend')
      .send({ email: testUser.email })
      .expect(429);

    expect(throttledResponse.body).toHaveProperty('error');
    expect(throttledResponse.body.error.code).toBe('THROTTLED');
  });

  it('should handle invalid verification token', async () => {
    const invalidTokenResponse = await request(app)
      .post('/api/auth/verify')
      .send({ token: 'invalid-token-123' })
      .expect(401);

    expect(invalidTokenResponse.body).toHaveProperty('error');
    expect(invalidTokenResponse.body.error.code).toBe('INVALID_TOKEN');
  });

  it('should handle expired verification token', async () => {
    // Register user
    await request(app)
      .post('/api/auth/register')
      .send(testUser)
      .expect(201);

    // Get token
    const tokenResponse = await request(app)
      .get(`/api/test/last-verification-token?email=${testUser.email}`)
      .expect(200);

    const token = tokenResponse.body.token;

    // Use the token once
    await request(app)
      .post('/api/auth/verify')
      .send({ token })
      .expect(200);

    // Try to use the same token again (should be consumed/expired)
    const expiredResponse = await request(app)
      .post('/api/auth/verify')
      .send({ token })
      .expect(410);

    expect(expiredResponse.body).toHaveProperty('error');
    expect(expiredResponse.body.error.code).toBe('TOKEN_EXPIRED');
  });

  it('should handle missing email in resend request', async () => {
    const response = await request(app)
      .post('/api/auth/resend')
      .send({})
      .expect(400);

    expect(response.body).toHaveProperty('error');
    expect(response.body.error.code).toBe('MISSING_EMAIL');
  });

  it('should handle missing token in verify request', async () => {
    const response = await request(app)
      .post('/api/auth/verify')
      .send({})
      .expect(400);

    expect(response.body).toHaveProperty('error');
    expect(response.body.error.code).toBe('MISSING_TOKEN');
  });

  it('should always return 202 for resend, even for non-existent email', async () => {
    const response = await request(app)
      .post('/api/auth/resend')
      .send({ email: 'nonexistent@example.com' })
      .expect(202);

    expect(response.body).toHaveProperty('message');
  });
});
