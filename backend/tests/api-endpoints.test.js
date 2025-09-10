const jwt = require('jsonwebtoken');
const request = require('supertest');

// Mock external dependencies
jest.mock('axios');
jest.mock('../../api/_lib/database.js', () => ({
  getSupabaseClient: jest.fn(),
  getSupabaseAdmin: jest.fn()
}));

const axios = require('axios');

const { getSupabaseAdmin } = require('../../api/_lib/database.js');

// Mock the API handler - we'll test the functions directly
const mockApiHandler = {
  'POST /auth/register': jest.fn(),
  'POST /auth/verify-email': jest.fn(),
  'POST /oauth/analyze-gmail': jest.fn(),
  'POST /onboarding/business-data': jest.fn(),
  'GET /dashboard/business-config': jest.fn(),
  'PUT /dashboard/business-config': jest.fn()
};

// Create alias for compatibility
const apiHandler = mockApiHandler;

describe('API Endpoints', () => {
  let mockSupabase;
  let validToken;
  let mockUser;

  beforeEach(() => {
    // Setup mock user and token
    mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      first_name: 'John',
      last_name: 'Doe',
      company_name: 'Test Hot Tub Co'
    };

    validToken = jwt.sign(
      { userId: mockUser.id, email: mockUser.email },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '24h' }
    );

    // Setup mock Supabase
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockUser, error: null }),
      insert: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis()
    };

    getSupabaseAdmin.mockReturnValue(mockSupabase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /auth/register', () => {
    test('should register new user successfully', async () => {
      const userData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'password123',
        businessName: 'Hot Tub Paradise'
      };

      mockSupabase.single
        .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } }) // User doesn't exist
        .mockResolvedValueOnce({ data: { ...mockUser, ...userData }, error: null }); // Insert success

      const response = await request(apiHandler)
        .post('/auth/register')
        .send(userData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('requiresEmailVerification', true);
      expect(response.body.user.emailVerified).toBe(false);
    });

    test('should reject registration with missing fields', async () => {
      const response = await request(apiHandler)
        .post('/auth/register')
        .send({
          email: 'test@example.com'
          // Missing required fields
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    test('should reject registration with invalid email', async () => {
      const response = await request(apiHandler)
        .post('/auth/register')
        .send({
          firstName: 'John',
          lastName: 'Doe',
          email: 'invalid-email',
          password: 'password123'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid email');
    });

    test('should reject registration with short password', async () => {
      const response = await request(apiHandler)
        .post('/auth/register')
        .send({
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          password: '123'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid password');
    });
  });

  describe('POST /auth/verify-email', () => {
    test('should verify email successfully', async () => {
      const verificationToken = jwt.sign(
        { email: 'test@example.com', type: 'email_verification' },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '24h' }
      );

      mockSupabase.single.mockResolvedValue({
        data: { ...mockUser, email_verified: false, verification_token: verificationToken },
        error: null
      });

      const response = await request(apiHandler)
        .post('/auth/verify-email')
        .send({ token: verificationToken });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.emailVerified).toBe(true);
    });

    test('should reject invalid verification token', async () => {
      const response = await request(apiHandler)
        .post('/auth/verify-email')
        .send({ token: 'invalid-token' });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });

    test('should handle already verified email', async () => {
      const verificationToken = jwt.sign(
        { email: 'test@example.com', type: 'email_verification' },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '24h' }
      );

      mockSupabase.single.mockResolvedValue({
        data: { ...mockUser, email_verified: true, verification_token: verificationToken },
        error: null
      });

      const response = await request(apiHandler)
        .post('/auth/verify-email')
        .send({ token: verificationToken });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('already verified');
    });
  });

  describe('POST /oauth/analyze-gmail', () => {
    beforeEach(() => {
      // Mock Gmail API response
      axios.get.mockResolvedValue({
        data: {
          labels: [
            { id: 'Label_1', name: 'Service Requests', type: 'user' },
            { id: 'Label_2', name: 'New Customers', type: 'user' },
            { id: 'INBOX', name: 'INBOX', type: 'system' }
          ]
        }
      });

      // Mock OAuth credentials
      mockSupabase.single.mockResolvedValue({
        data: { access_token: 'mock-access-token', refresh_token: 'mock-refresh-token' },
        error: null
      });
    });

    test('should analyze Gmail labels successfully', async () => {
      const response = await request(apiHandler)
        .post('/oauth/analyze-gmail')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('analysis');
      expect(response.body).toHaveProperty('businessForm');
      expect(response.body).toHaveProperty('recommendations');

      expect(axios.get).toHaveBeenCalledWith(
        'https://gmail.googleapis.com/gmail/v1/users/me/labels',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-access-token'
          })
        })
      );
    });

    test('should require authentication', async () => {
      const response = await request(apiHandler)
        .post('/oauth/analyze-gmail');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test('should require OAuth credentials', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }
      });

      const response = await request(apiHandler)
        .post('/oauth/analyze-gmail')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('OAuth connection required');
    });
  });

  describe('POST /onboarding/business-data', () => {
    const validBusinessData = {
      company_name: 'Hot Tub Paradise',
      business_phone: '(555) 123-4567',
      business_address: '123 Main St, City, State 12345',
      service_area_radius: 25,
      primary_services: ['installation', 'repair', 'maintenance'],
      business_hours: 'Mon-Fri 8AM-6PM',
      response_time_goal: '4_hours',
      team_size: '2-3',
      use_company_signature: 'yes',
      company_signature: 'Best regards,\nHot Tub Paradise Team'
    };

    test('should save business data successfully', async () => {
      mockSupabase.single.mockResolvedValue({
        data: { ...validBusinessData, user_id: mockUser.id },
        error: null
      });

      const response = await request(apiHandler)
        .post('/onboarding/business-data')
        .set('Authorization', `Bearer ${validToken}`)
        .send(validBusinessData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('businessData');
      expect(response.body.nextStep).toBe('dashboard');
    });

    test('should require authentication', async () => {
      const response = await request(apiHandler)
        .post('/onboarding/business-data')
        .send(validBusinessData);

      expect(response.status).toBe(401);
    });

    test('should validate required fields', async () => {
      const incompleteData = {
        company_name: 'Test Company'
        // Missing required fields
      };

      const response = await request(apiHandler)
        .post('/onboarding/business-data')
        .set('Authorization', `Bearer ${validToken}`)
        .send(incompleteData);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Missing required');
    });

    test('should handle signature settings correctly', async () => {
      const dataWithSignature = {
        ...validBusinessData,
        use_company_signature: 'yes',
        company_signature: 'Test signature'
      };

      mockSupabase.single.mockResolvedValue({
        data: { ...dataWithSignature, user_id: mockUser.id },
        error: null
      });

      const response = await request(apiHandler)
        .post('/onboarding/business-data')
        .set('Authorization', `Bearer ${validToken}`)
        .send(dataWithSignature);

      expect(response.status).toBe(200);
      expect(mockSupabase.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          use_company_signature: true,
          company_signature: 'Test signature'
        })
      );
    });

    test('should handle no signature setting', async () => {
      const dataWithoutSignature = {
        ...validBusinessData,
        use_company_signature: 'no'
      };

      mockSupabase.single.mockResolvedValue({
        data: { ...dataWithoutSignature, user_id: mockUser.id },
        error: null
      });

      const response = await request(apiHandler)
        .post('/onboarding/business-data')
        .set('Authorization', `Bearer ${validToken}`)
        .send(dataWithoutSignature);

      expect(response.status).toBe(200);
      expect(mockSupabase.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          use_company_signature: false,
          company_signature: null
        })
      );
    });
  });

  describe('GET /dashboard/business-config', () => {
    test('should fetch business configuration', async () => {
      const mockConfig = {
        user_id: mockUser.id,
        company_name: 'Hot Tub Paradise',
        business_phone: '(555) 123-4567',
        custom_managers: ['Hailey', 'Jillian'],
        custom_suppliers: ['Aqua Spa', 'Paradise Patio']
      };

      mockSupabase.single.mockResolvedValue({
        data: mockConfig,
        error: null
      });

      const response = await request(apiHandler)
        .get('/dashboard/business-config')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.businessConfig).toEqual(mockConfig);
    });

    test('should handle no configuration found', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }
      });

      const response = await request(apiHandler)
        .get('/dashboard/business-config')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.businessConfig).toBeNull();
    });
  });

  describe('PUT /dashboard/business-config', () => {
    test('should update business configuration', async () => {
      const updatedConfig = {
        company_name: 'Updated Hot Tub Co',
        custom_managers: ['Hailey', 'Jillian', 'New Manager'],
        custom_suppliers: ['Aqua Spa', 'New Supplier']
      };

      mockSupabase.single.mockResolvedValue({
        data: { ...updatedConfig, user_id: mockUser.id },
        error: null
      });

      const response = await request(apiHandler)
        .put('/dashboard/business-config')
        .set('Authorization', `Bearer ${validToken}`)
        .send(updatedConfig);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.businessConfig.company_name).toBe('Updated Hot Tub Co');
    });

    test('should limit managers to 5', async () => {
      const configWithTooManyManagers = {
        company_name: 'Test Company',
        custom_managers: ['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7'] // 7 managers
      };

      mockSupabase.single.mockResolvedValue({
        data: { ...configWithTooManyManagers, user_id: mockUser.id },
        error: null
      });

      await request(apiHandler)
        .put('/dashboard/business-config')
        .set('Authorization', `Bearer ${validToken}`)
        .send(configWithTooManyManagers);

      expect(mockSupabase.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          custom_managers: expect.arrayContaining(['M1', 'M2', 'M3', 'M4', 'M5'])
        })
      );

      const call = mockSupabase.upsert.mock.calls[0][0];
      expect(call.custom_managers).toHaveLength(5);
    });
  });
});
