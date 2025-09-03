const request = require('supertest');
const supabaseTest = require('../utils/supabaseTest');

describe('Invitation Flow Integration Tests', () => {
  let authToken;
  let testUser;
  let testCompany;

  beforeAll(async () => {
    // Set up test user and get auth token
    testUser = supabaseTest.getTestUser(process.env.TEST_USER_EMAIL);
    authToken = await supabaseTest.getAuthToken(
      process.env.TEST_USER_EMAIL,
      process.env.TEST_USER_PASSWORD
    );

    // Create test company
    testCompany = await supabaseTest.createTestData('companies', {
      name: 'Test Company',
      user_id: testUser.id
    });
  });

  describe('Create Invitation', () => {
    it('should create invitation successfully', async () => {
      const inviteData = {
        company_id: testCompany.id,
        email: 'test.invite@example.com',
        role: 'member'
      };

      const response = await request(process.env.TEST_SERVER_URL)
        .post('/api/invitations')
        .set('Authorization', `Bearer ${authToken}`)
        .send(inviteData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        email: inviteData.email,
        role: inviteData.role,
        status: 'pending'
      });
    });

    it('should fail to create invitation without company_id', async () => {
      const inviteData = {
        email: 'test.invite@example.com',
        role: 'member'
      };

      const response = await request(process.env.TEST_SERVER_URL)
        .post('/api/invitations')
        .set('Authorization', `Bearer ${authToken}`)
        .send(inviteData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('company_id');
    });
  });

  describe('List Invitations', () => {
    beforeAll(async () => {
      // Create test invitations
      await supabaseTest.createTestData('invitations', {
        company_id: testCompany.id,
        email: 'test.invite1@example.com',
        role: 'member',
        status: 'pending'
      });
      await supabaseTest.createTestData('invitations', {
        company_id: testCompany.id,
        email: 'test.invite2@example.com',
        role: 'admin',
        status: 'pending'
      });
    });

    it('should list company invitations', async () => {
      const response = await request(process.env.TEST_SERVER_URL)
        .get(`/api/companies/${testCompany.id}/invitations`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(2);
      expect(response.body.data[0]).toHaveProperty('email');
      expect(response.body.data[0]).toHaveProperty('role');
      expect(response.body.data[0]).toHaveProperty('status');
    });
  });

  describe('Accept Invitation', () => {
    let testInvitation;

    beforeAll(async () => {
      // Create a test invitation
      testInvitation = await supabaseTest.createTestData('invitations', {
        company_id: testCompany.id,
        email: 'test.accept@example.com',
        role: 'member',
        status: 'pending'
      });
    });

    it('should accept invitation successfully', async () => {
      const response = await request(process.env.TEST_SERVER_URL)
        .post(`/api/invitations/${testInvitation.id}/accept`)
        .send({
          token: testInvitation.token
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        status: 'accepted'
      });

      // Verify company membership
      const membershipResponse = await request(process.env.TEST_SERVER_URL)
        .get(`/api/companies/${testCompany.id}/members`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(membershipResponse.status).toBe(200);
      expect(membershipResponse.body.data).toContainEqual(
        expect.objectContaining({
          email: 'test.accept@example.com',
          role: 'member'
        })
      );
    });

    it('should fail to accept invitation with invalid token', async () => {
      const response = await request(process.env.TEST_SERVER_URL)
        .post(`/api/invitations/${testInvitation.id}/accept`)
        .send({
          token: 'invalid-token'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Cancel Invitation', () => {
    let testInvitation;

    beforeAll(async () => {
      // Create a test invitation
      testInvitation = await supabaseTest.createTestData('invitations', {
        company_id: testCompany.id,
        email: 'test.cancel@example.com',
        role: 'member',
        status: 'pending'
      });
    });

    it('should cancel invitation successfully', async () => {
      const response = await request(process.env.TEST_SERVER_URL)
        .delete(`/api/invitations/${testInvitation.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify invitation is cancelled
      const checkResponse = await request(process.env.TEST_SERVER_URL)
        .get(`/api/companies/${testCompany.id}/invitations`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(checkResponse.body.data).not.toContainEqual(
        expect.objectContaining({
          id: testInvitation.id
        })
      );
    });
  });

  afterAll(async () => {
    // Clean up test data
    await supabaseTest.cleanup();
  });
});
