/**
 * Dashboard API Tests
 * Tests dashboard endpoints, statistics, and activity tracking
 */

const request = require('supertest');
const app = require('../../backend/app');
const { databaseOperations } = require('../../backend/database/database-operations');
const { scheduler } = require('../../backend/scheduler/n8nScheduler');

// Mock dependencies
jest.mock('../../backend/database/database-operations');
jest.mock('../../backend/scheduler/n8nScheduler');

describe('Dashboard API', () => {
  let authToken;
  let userId;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock user data
    userId = 'test-user-123';
    authToken = 'valid-jwt-token';
    
    // Mock authentication middleware
    jest.doMock('../../backend/middleware/auth', () => ({
      authenticateToken: (req, res, next) => {
        req.user = { id: userId };
        next();
      }
    }));
  });

  describe('GET /api/dashboard', () => {
    test('should return complete dashboard data', async () => {
      // Mock database operations
      const mockUserProfile = {
        data: {
          id: userId,
          email: 'test@example.com',
          first_name: 'John',
          last_name: 'Doe',
          company_name: 'Test Company',
          email_verified: true
        }
      };

      const mockUserConfig = {
        data: {
          email_provider: 'gmail',
          business_type_id: 1,
          business_type_name: 'Hot Tub Services',
          business_type_description: 'Hot tub installation and maintenance',
          custom_settings: { notifications: true }
        }
      };

      const mockWorkflow = {
        data: {
          workflow_id: 'workflow-123',
          status: 'active',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      };

      const mockActivity = {
        data: [
          {
            id: 1,
            activity_type: 'LOGIN',
            metadata: { ip: '127.0.0.1' },
            created_at: '2024-01-01T00:00:00Z'
          }
        ]
      };

      const mockWorkflowStats = {
        success: true,
        data: {
          totalExecutions: 10,
          successRate: 95,
          lastExecution: '2024-01-01T00:00:00Z'
        }
      };

      databaseOperations.getUserProfile.mockResolvedValue(mockUserProfile);
      databaseOperations.getUserConfiguration.mockResolvedValue(mockUserConfig);
      databaseOperations.getUserWorkflow.mockResolvedValue(mockWorkflow);
      databaseOperations.getUserActivityHistory.mockResolvedValue(mockActivity);
      scheduler.getWorkflowStatistics.mockResolvedValue(mockWorkflowStats);

      const response = await request(app)
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('configuration');
      expect(response.body.data).toHaveProperty('workflow');
      expect(response.body.data).toHaveProperty('activity');

      // Verify user data
      expect(response.body.data.user).toEqual({
        id: userId,
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        companyName: 'Test Company',
        emailVerified: true
      });

      // Verify configuration data
      expect(response.body.data.configuration).toEqual({
        emailProvider: 'gmail',
        businessType: {
          id: 1,
          name: 'Hot Tub Services',
          description: 'Hot tub installation and maintenance'
        },
        customSettings: { notifications: true }
      });

      // Verify workflow data
      expect(response.body.data.workflow).toEqual({
        id: 'workflow-123',
        status: 'active',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        statistics: mockWorkflowStats.data
      });
    });

    test('should handle user not found', async () => {
      databaseOperations.getUserProfile.mockResolvedValue({ data: null });

      const response = await request(app)
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('User not found');
    });

    test('should handle missing configuration gracefully', async () => {
      const mockUserProfile = {
        data: {
          id: userId,
          email: 'test@example.com',
          first_name: 'John',
          last_name: 'Doe',
          company_name: 'Test Company',
          email_verified: true
        }
      };

      databaseOperations.getUserProfile.mockResolvedValue(mockUserProfile);
      databaseOperations.getUserConfiguration.mockResolvedValue({ data: null });
      databaseOperations.getUserWorkflow.mockResolvedValue({ data: null });
      databaseOperations.getUserActivityHistory.mockResolvedValue({ data: [] });

      const response = await request(app)
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.configuration).toBeNull();
      expect(response.body.data.workflow).toBeNull();
    });

    test('should handle workflow statistics failure gracefully', async () => {
      const mockUserProfile = {
        data: {
          id: userId,
          email: 'test@example.com',
          first_name: 'John',
          last_name: 'Doe',
          company_name: 'Test Company',
          email_verified: true
        }
      };

      const mockWorkflow = {
        data: {
          workflow_id: 'workflow-123',
          status: 'active',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      };

      databaseOperations.getUserProfile.mockResolvedValue(mockUserProfile);
      databaseOperations.getUserConfiguration.mockResolvedValue({ data: null });
      databaseOperations.getUserWorkflow.mockResolvedValue(mockWorkflow);
      databaseOperations.getUserActivityHistory.mockResolvedValue({ data: [] });
      scheduler.getWorkflowStatistics.mockResolvedValue({ success: false });

      const response = await request(app)
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.workflow.statistics).toBeNull();
    });
  });

  describe('GET /api/dashboard/statistics', () => {
    test('should return workflow statistics', async () => {
      const mockWorkflow = {
        data: {
          workflow_id: 'workflow-123',
          status: 'active'
        }
      };

      const mockStats = {
        success: true,
        data: {
          totalExecutions: 25,
          successRate: 96,
          averageExecutionTime: 1500,
          lastExecution: '2024-01-01T12:00:00Z'
        }
      };

      databaseOperations.getUserWorkflow.mockResolvedValue(mockWorkflow);
      scheduler.getWorkflowStatistics.mockResolvedValue(mockStats);

      const response = await request(app)
        .get('/api/dashboard/statistics')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.hasWorkflow).toBe(true);
      expect(response.body.data.workflowId).toBe('workflow-123');
      expect(response.body.data.statistics).toEqual(mockStats.data);
    });

    test('should handle no workflow case', async () => {
      databaseOperations.getUserWorkflow.mockResolvedValue({ data: null });

      const response = await request(app)
        .get('/api/dashboard/statistics')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.hasWorkflow).toBe(false);
      expect(response.body.data.statistics).toBeNull();
    });

    test('should handle statistics failure', async () => {
      const mockWorkflow = {
        data: {
          workflow_id: 'workflow-123',
          status: 'active'
        }
      };

      databaseOperations.getUserWorkflow.mockResolvedValue(mockWorkflow);
      scheduler.getWorkflowStatistics.mockResolvedValue({ success: false });

      const response = await request(app)
        .get('/api/dashboard/statistics')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.hasWorkflow).toBe(true);
      expect(response.body.data.statistics).toBeNull();
    });
  });

  describe('GET /api/dashboard/activity', () => {
    test('should return user activity with default pagination', async () => {
      const mockActivity = {
        data: [
          {
            id: 1,
            activity_type: 'LOGIN',
            metadata: { ip: '127.0.0.1' },
            created_at: '2024-01-01T00:00:00Z'
          },
          {
            id: 2,
            activity_type: 'WORKFLOW_CREATED',
            metadata: { workflowId: 'workflow-123' },
            created_at: '2024-01-01T01:00:00Z'
          }
        ]
      };

      databaseOperations.getUserActivityHistory.mockResolvedValue(mockActivity);

      const response = await request(app)
        .get('/api/dashboard/activity')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].activity_type).toBe('LOGIN');
    });

    test('should handle custom pagination parameters', async () => {
      const mockActivity = {
        data: [
          {
            id: 1,
            activity_type: 'LOGIN',
            metadata: { ip: '127.0.0.1' },
            created_at: '2024-01-01T00:00:00Z'
          }
        ]
      };

      databaseOperations.getUserActivityHistory.mockResolvedValue(mockActivity);

      const response = await request(app)
        .get('/api/dashboard/activity?limit=5&offset=10')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(databaseOperations.getUserActivityHistory).toHaveBeenCalledWith(userId, 5, 10);
    });

    test('should handle empty activity list', async () => {
      databaseOperations.getUserActivityHistory.mockResolvedValue({ data: [] });

      const response = await request(app)
        .get('/api/dashboard/activity')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([]);
    });
  });

  describe('Error Handling', () => {
    test('should handle database errors gracefully', async () => {
      databaseOperations.getUserProfile.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Failed to get dashboard data');
    });

    test('should handle scheduler errors gracefully', async () => {
      const mockUserProfile = {
        data: {
          id: userId,
          email: 'test@example.com',
          first_name: 'John',
          last_name: 'Doe',
          company_name: 'Test Company',
          email_verified: true
        }
      };

      const mockWorkflow = {
        data: {
          workflow_id: 'workflow-123',
          status: 'active',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      };

      databaseOperations.getUserProfile.mockResolvedValue(mockUserProfile);
      databaseOperations.getUserConfiguration.mockResolvedValue({ data: null });
      databaseOperations.getUserWorkflow.mockResolvedValue(mockWorkflow);
      databaseOperations.getUserActivityHistory.mockResolvedValue({ data: [] });
      scheduler.getWorkflowStatistics.mockRejectedValue(new Error('Scheduler service unavailable'));

      const response = await request(app)
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.workflow.statistics).toBeNull();
    });
  });

  describe('Authentication', () => {
    test('should require authentication', async () => {
      const response = await request(app)
        .get('/api/dashboard');

      expect(response.status).toBe(401);
    });

    test('should require valid token format', async () => {
      const response = await request(app)
        .get('/api/dashboard')
        .set('Authorization', 'InvalidToken');

      expect(response.status).toBe(401);
    });
  });
});