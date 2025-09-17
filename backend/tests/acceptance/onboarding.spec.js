const request = require('supertest');
const app = require('../../app');
const { databaseOperations } = require('../../database/database-operations');
const { query } = require('../../database/unified-connection');

describe('Onboarding API', () => {
  let agent;
  let userId;
  let csrfToken;

  beforeAll(async () => {
    // Create a test user and get auth cookies
    const testUser = {
      email: `onboarding-test-${Date.now()}@example.com`,
      password: 'TestPassword123!'
    };

    // Create agent to persist cookies
    agent = request.agent(app);

    // Register user
    const registerResponse = await agent
      .post('/api/auth/register')
      .send(testUser);

    expect(registerResponse.status).toBe(201);
    userId = registerResponse.body.userId;

    // Manually verify the user for tests
    await query('UPDATE users SET email_verified = true WHERE id = $1', [userId]);

    // Login to get session cookies
    const loginResponse = await agent
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password
      });

    expect(loginResponse.status).toBe(200);

    // Get CSRF token
    const csrfResponse = await agent.get('/api/auth/csrf');
    expect(csrfResponse.status).toBe(200);
    csrfToken = csrfResponse.body.csrf;
  });

  afterAll(async () => {
    // Clean up test user
    if (userId) {
      await databaseOperations.deleteUser(userId);
    }
  });

  describe('GET /api/onboarding', () => {
    it('should return default onboarding state for new user', async () => {
      const response = await agent
        .get('/api/onboarding');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        step: 1,
        data: {},
        completed: false
      });
    });
  });

  describe('PUT /api/onboarding', () => {
    it('should update step 1 with valid business profile data', async () => {
      const step1Data = {
        businessName: 'Test Hot Tub Co',
        businessType: 'dealer',
        timezone: 'America/New_York',
        hours: 'Mon-Fri 9AM-5PM',
        serviceAreaRadius: 50
      };

      const response = await agent
        .put('/api/onboarding')
        .set('x-csrf-token', csrfToken)
        .send({
          step: 1,
          patch: step1Data
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        step: 1,
        data: expect.objectContaining(step1Data)
      });
    });

    it('should update step 2 with Gmail integration data', async () => {
      const step2Data = {
        gmailConnected: true
      };

      const response = await agent
        .put('/api/onboarding')
        .set('x-csrf-token', csrfToken)
        .send({
          step: 2,
          patch: step2Data
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        step: 2,
        data: expect.objectContaining(step2Data)
      });
    });

    it('should update step 3 with label mapping data', async () => {
      const step3Data = {
        labelMap: {
          service: 'Service Requests',
          sales: 'Sales Inquiries',
          parts: 'Parts & Accessories',
          warranty: 'Warranty Claims',
          support: 'General Support'
        },
        thresholds: {
          confidenceMin: 0.7
        }
      };

      const response = await agent
        .put('/api/onboarding')
        .set('x-csrf-token', csrfToken)
        .send({
          step: 3,
          patch: step3Data
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        step: 3,
        data: expect.objectContaining(step3Data)
      });
    });

    it('should update step 4 with team and notifications data', async () => {
      const step4Data = {
        team: [
          { email: 'owner@test.com', role: 'owner' },
          { email: 'manager@test.com', role: 'manager' }
        ],
        suppliers: ['Supplier One', 'Supplier Two'],
        notifications: {
          email: true,
          sms: false
        }
      };

      const response = await agent
        .put('/api/onboarding')
        .set('x-csrf-token', csrfToken)
        .send({
          step: 4,
          patch: step4Data
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        step: 4,
        data: expect.objectContaining(step4Data)
      });
    });

    it('should reject step regression', async () => {
      const response = await agent
        .put('/api/onboarding')
        .set('x-csrf-token', csrfToken)
        .send({
          step: 2,
          patch: { gmailConnected: false }
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('STEP_REGRESSION');
    });

    it('should validate step data', async () => {
      const response = await agent
        .put('/api/onboarding')
        .set('x-csrf-token', csrfToken)
        .send({
          step: 4,
          patch: { businessName: 'A' } // Invalid field for step 4
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_FAILED');
    });
  });

  describe('POST /api/onboarding/complete', () => {
    it('should complete onboarding when all steps are valid', async () => {
      const response = await agent
        .post('/api/onboarding/complete')
        .set('x-csrf-token', csrfToken);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ ok: true });

      // Verify completion
      const stateResponse = await agent
        .get('/api/onboarding');

      expect(stateResponse.body.completed).toBe(true);
    });
  });

  describe('Validation', () => {
    let testUserId;
    let testAgent;
    let testCsrfToken;

    beforeEach(async () => {
      // Create a fresh test user for validation tests
      const testUser = {
        email: `validation-test-${Date.now()}@example.com`,
        password: 'TestPassword123!'
      };

      testAgent = request.agent(app);

      const registerResponse = await testAgent
        .post('/api/auth/register')
        .send(testUser);

      testUserId = registerResponse.body.userId;

      // Manually verify the user for tests
      await query('UPDATE users SET email_verified = true WHERE id = $1', [testUserId]);

      // Login
      const loginResponse = await testAgent
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });

      expect(loginResponse.status).toBe(200);

      // Get CSRF token
      const csrfResponse = await testAgent.get('/api/auth/csrf');
      expect(csrfResponse.status).toBe(200);
      testCsrfToken = csrfResponse.body.csrf;
    });

    afterEach(async () => {
      if (testUserId) {
        await databaseOperations.deleteUser(testUserId);
      }
    });

    it('should reject completion with incomplete data', async () => {
      // Only complete step 1
      await testAgent
        .put('/api/onboarding')
        .set('x-csrf-token', testCsrfToken)
        .send({
          step: 1,
          patch: {
            businessName: 'Test Business',
            businessType: 'dealer',
            timezone: 'America/New_York'
          }
        });

      const response = await testAgent
        .post('/api/onboarding/complete')
        .set('x-csrf-token', testCsrfToken);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_FAILED');
      expect(response.body.error.details).toEqual(expect.arrayContaining([
        expect.stringContaining('Step 2:')
      ]));
    });

    it('should validate team member limits', async () => {
      const tooManyTeamMembers = {
        team: Array(6).fill().map((_, i) => ({
          email: `member${i}@test.com`,
          role: 'staff'
        })),
        notifications: { email: true, sms: false }
      };

      const response = await testAgent
        .put('/api/onboarding')
        .set('x-csrf-token', testCsrfToken)
        .send({
          step: 4,
          patch: tooManyTeamMembers
        });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('1-5 members');
    });

    it('should validate email addresses', async () => {
      const invalidEmailData = {
        team: [{ email: 'invalid-email', role: 'owner' }],
        notifications: { email: true, sms: false }
      };

      const response = await testAgent
        .put('/api/onboarding')
        .set('x-csrf-token', testCsrfToken)
        .send({
          step: 4,
          patch: invalidEmailData
        });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('valid email');
    });
  });
});
