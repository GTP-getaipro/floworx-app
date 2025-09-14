/**
 * Business Types API Tests
 * Comprehensive testing for business types functionality
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');

// Set environment to test to ensure app is exported
process.env.NODE_ENV = 'production';
process.env.VERCEL = 'true';

const app = require('../../server');

describe('Business Types API', () => {
  let authToken;
  let testUserId;

  beforeAll(() => {
    // Create a test JWT token
    testUserId = 'test-user-id-123';
    authToken = jwt.sign(
      { id: testUserId, email: 'test@example.com' },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  });

  describe('GET /api/business-types/test', () => {
    it('should return success for test endpoint', async () => {
      const response = await request(app)
        .get('/api/business-types/test')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Business types route is working'
      });
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('GET /api/business-types', () => {
    it('should fetch all business types successfully', async () => {
      const response = await request(app)
        .get('/api/business-types')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.any(Array)
      });
    });

    it('should handle database errors gracefully', async () => {
      // Mock database error by temporarily breaking the connection
      const originalGetBusinessTypes = require('../../database/database-operations').databaseOperations.getBusinessTypes;
      
      require('../../database/database-operations').databaseOperations.getBusinessTypes = jest.fn()
        .mockResolvedValue({ error: new Error('Database connection failed') });

      const response = await request(app)
        .get('/api/business-types')
        .expect(500);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Database error',
        message: 'Failed to fetch business types'
      });

      // Restore original function
      require('../../database/database-operations').databaseOperations.getBusinessTypes = originalGetBusinessTypes;
    });
  });

  describe('GET /api/business-types/:slug', () => {
    it('should fetch business type by slug successfully', async () => {
      // First get all business types to find a valid slug
      const allTypesResponse = await request(app)
        .get('/api/business-types')
        .expect(200);

      if (allTypesResponse.body.data && allTypesResponse.body.data.length > 0) {
        const firstType = allTypesResponse.body.data[0];
        const slug = firstType.slug;

        const response = await request(app)
          .get(`/api/business-types/${slug}`)
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          data: expect.objectContaining({
            slug: slug
          })
        });
      }
    });

    it('should return 404 for non-existent slug', async () => {
      const response = await request(app)
        .get('/api/business-types/non-existent-slug')
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Business type not found'
      });
    });
  });

  describe('POST /api/business-types/select', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/business-types/select')
        .send({ businessTypeId: 1 })
        .expect(401);

      expect(response.body).toMatchObject({
        error: 'Access denied'
      });
    });

    it('should validate business type ID', async () => {
      const response = await request(app)
        .post('/api/business-types/select')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ businessTypeId: 'invalid' })
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'Validation failed'
      });
    });

    it('should select business type successfully with valid data', async () => {
      // Mock successful database operations
      const mockGetBusinessTypeById = jest.fn().mockResolvedValue({
        data: {
          id: 1,
          name: 'Test Business',
          slug: 'test-business',
          default_categories: ['category1', 'category2']
        }
      });

      const mockUpdateUserBusinessType = jest.fn().mockResolvedValue({
        data: { id: testUserId }
      });

      const mockUpdateOnboardingProgress = jest.fn().mockResolvedValue({
        data: {}
      });

      // Mock the database operations
      const databaseOperations = require('../../database/database-operations').databaseOperations;
      const originalGetBusinessTypeById = databaseOperations.getBusinessTypeById;
      const originalUpdateUserBusinessType = databaseOperations.updateUserBusinessType;
      const originalUpdateOnboardingProgress = databaseOperations.updateOnboardingProgress;

      databaseOperations.getBusinessTypeById = mockGetBusinessTypeById;
      databaseOperations.updateUserBusinessType = mockUpdateUserBusinessType;
      databaseOperations.updateOnboardingProgress = mockUpdateOnboardingProgress;

      const response = await request(app)
        .post('/api/business-types/select')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ businessTypeId: 1 })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Business type selected successfully',
        data: {
          businessType: {
            id: 1,
            name: 'Test Business',
            slug: 'test-business'
          }
        }
      });

      expect(mockGetBusinessTypeById).toHaveBeenCalledWith(1);
      expect(mockUpdateUserBusinessType).toHaveBeenCalledWith(testUserId, 1);

      // Restore original functions
      databaseOperations.getBusinessTypeById = originalGetBusinessTypeById;
      databaseOperations.updateUserBusinessType = originalUpdateUserBusinessType;
      databaseOperations.updateOnboardingProgress = originalUpdateOnboardingProgress;
    });
  });

  describe('GET /api/business-types/user/current', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/business-types/user/current')
        .expect(401);

      expect(response.body).toMatchObject({
        error: 'Access denied'
      });
    });

    it('should return null when no business type is selected', async () => {
      // Mock user without business type
      const mockGetUserById = jest.fn().mockResolvedValue({
        data: {
          id: testUserId,
          email: 'test@example.com',
          business_type_id: null
        }
      });

      const databaseOperations = require('../../database/database-operations').databaseOperations;
      const originalGetUserById = databaseOperations.getUserById;
      databaseOperations.getUserById = mockGetUserById;

      const response = await request(app)
        .get('/api/business-types/user/current')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: null,
        message: 'No business type selected'
      });

      // Restore original function
      databaseOperations.getUserById = originalGetUserById;
    });
  });

  describe('GET /api/business-types/:businessTypeId/template', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/business-types/1/template')
        .expect(401);

      expect(response.body).toMatchObject({
        error: 'Access denied'
      });
    });

    it('should return workflow template for valid business type', async () => {
      // Mock business type data
      const mockGetBusinessTypeById = jest.fn().mockResolvedValue({
        data: {
          id: 1,
          name: 'Test Business',
          slug: 'test-business',
          default_categories: ['category1', 'category2']
        }
      });

      const databaseOperations = require('../../database/database-operations').databaseOperations;
      const originalGetBusinessTypeById = databaseOperations.getBusinessTypeById;
      databaseOperations.getBusinessTypeById = mockGetBusinessTypeById;

      const response = await request(app)
        .get('/api/business-types/1/template')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          businessTypeId: 1,
          businessTypeName: 'Test Business',
          categories: ['category1', 'category2'],
          workflowSteps: expect.any(Array)
        }
      });

      expect(response.body.data.workflowSteps).toHaveLength(3);
      expect(response.body.data.workflowSteps[0]).toMatchObject({
        name: 'Email Processing',
        enabled: true
      });

      // Restore original function
      databaseOperations.getBusinessTypeById = originalGetBusinessTypeById;
    });
  });
});
