/**
 * Workflow Reconfiguration API Tests
 * Tests workflow reconfiguration endpoint and validation
 */

const request = require('supertest');
const app = require('../../backend/app');
const { databaseOperations } = require('../../backend/database/database-operations');
const { scheduler } = require('../../backend/scheduler/n8nScheduler');

// Mock dependencies
jest.mock('../../backend/database/database-operations');
jest.mock('../../backend/scheduler/n8nScheduler');

describe('Workflow Reconfiguration API', () => {
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

  describe('POST /api/workflows/reconfigure', () => {
    test('should reconfigure existing workflow successfully', async () => {
      const requestData = {
        emailProvider: 'gmail',
        businessTypeId: 1,
        customSettings: {
          notifications: true,
          autoReply: false
        }
      };

      const mockBusinessType = {
        data: {
          id: 1,
          name: 'Hot Tub Services',
          workflow_template: 'hot-tub-template'
        }
      };

      const mockWorkflow = {
        data: {
          workflow_id: 'workflow-123',
          status: 'active'
        }
      };

      const mockWorkflowResult = {
        success: true,
        workflowId: 'workflow-123'
      };

      databaseOperations.getBusinessTypeById.mockResolvedValue(mockBusinessType);
      databaseOperations.updateUserConfiguration.mockResolvedValue({ success: true });
      databaseOperations.getUserWorkflow.mockResolvedValue(mockWorkflow);
      databaseOperations.logUserActivity.mockResolvedValue({ success: true });
      scheduler.updateWorkflow.mockResolvedValue(mockWorkflowResult);

      const response = await request(app)
        .post('/api/workflows/reconfigure')
        .set('Authorization', `Bearer ${authToken}`)
        .send(requestData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Workflow reconfigured successfully');
      expect(response.body.data.workflowId).toBe('workflow-123');

      // Verify database operations were called correctly
      expect(databaseOperations.getBusinessTypeById).toHaveBeenCalledWith(1);
      expect(databaseOperations.updateUserConfiguration).toHaveBeenCalledWith(userId, {
        emailProvider: 'gmail',
        businessTypeId: 1,
        customSettings: requestData.customSettings
      });
      expect(scheduler.updateWorkflow).toHaveBeenCalledWith({
        workflowId: 'workflow-123',
        userId: userId,
        emailProvider: 'gmail',
        businessType: 'Hot Tub Services',
        template: 'hot-tub-template',
        customSettings: requestData.customSettings
      });
    });

    test('should deploy new workflow when none exists', async () => {
      const requestData = {
        emailProvider: 'outlook',
        businessTypeId: 2,
        customSettings: {
          notifications: true
        }
      };

      const mockBusinessType = {
        data: {
          id: 2,
          name: 'HVAC Services',
          workflow_template: 'hvac-template'
        }
      };

      const mockWorkflowResult = {
        success: true,
        workflowId: 'new-workflow-456'
      };

      databaseOperations.getBusinessTypeById.mockResolvedValue(mockBusinessType);
      databaseOperations.updateUserConfiguration.mockResolvedValue({ success: true });
      databaseOperations.getUserWorkflow.mockResolvedValue({ data: null });
      databaseOperations.updateUserWorkflow.mockResolvedValue({ success: true });
      databaseOperations.logUserActivity.mockResolvedValue({ success: true });
      scheduler.deployWorkflow.mockResolvedValue(mockWorkflowResult);

      const response = await request(app)
        .post('/api/workflows/reconfigure')
        .set('Authorization', `Bearer ${authToken}`)
        .send(requestData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.workflowId).toBe('new-workflow-456');

      // Verify new workflow deployment
      expect(scheduler.deployWorkflow).toHaveBeenCalledWith({
        userId: userId,
        emailProvider: 'outlook',
        businessType: 'HVAC Services',
        template: 'hvac-template',
        customSettings: requestData.customSettings
      });
      expect(databaseOperations.updateUserWorkflow).toHaveBeenCalledWith(userId, 'new-workflow-456');
    });

    test('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/workflows/reconfigure')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          emailProvider: 'gmail'
          // Missing businessTypeId
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Email provider and business type are required');
    });

    test('should validate business type exists', async () => {
      databaseOperations.getBusinessTypeById.mockResolvedValue({ data: null });

      const response = await request(app)
        .post('/api/workflows/reconfigure')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          emailProvider: 'gmail',
          businessTypeId: 999
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid business type ID');
    });

    test('should handle workflow update failure', async () => {
      const requestData = {
        emailProvider: 'gmail',
        businessTypeId: 1,
        customSettings: {}
      };

      const mockBusinessType = {
        data: {
          id: 1,
          name: 'Hot Tub Services',
          workflow_template: 'hot-tub-template'
        }
      };

      const mockWorkflow = {
        data: {
          workflow_id: 'workflow-123',
          status: 'active'
        }
      };

      const mockWorkflowResult = {
        success: false,
        error: 'Workflow update failed'
      };

      databaseOperations.getBusinessTypeById.mockResolvedValue(mockBusinessType);
      databaseOperations.updateUserConfiguration.mockResolvedValue({ success: true });
      databaseOperations.getUserWorkflow.mockResolvedValue(mockWorkflow);
      scheduler.updateWorkflow.mockResolvedValue(mockWorkflowResult);

      const response = await request(app)
        .post('/api/workflows/reconfigure')
        .set('Authorization', `Bearer ${authToken}`)
        .send(requestData);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Failed to reconfigure workflow');
      expect(response.body.error).toBe('Workflow update failed');
    });

    test('should handle database errors gracefully', async () => {
      databaseOperations.getBusinessTypeById.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .post('/api/workflows/reconfigure')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          emailProvider: 'gmail',
          businessTypeId: 1
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Failed to reconfigure workflow');
    });

    test('should log user activity', async () => {
      const requestData = {
        emailProvider: 'gmail',
        businessTypeId: 1,
        customSettings: {}
      };

      const mockBusinessType = {
        data: {
          id: 1,
          name: 'Hot Tub Services',
          workflow_template: 'hot-tub-template'
        }
      };

      const mockWorkflow = {
        data: {
          workflow_id: 'workflow-123',
          status: 'active'
        }
      };

      const mockWorkflowResult = {
        success: true,
        workflowId: 'workflow-123'
      };

      databaseOperations.getBusinessTypeById.mockResolvedValue(mockBusinessType);
      databaseOperations.updateUserConfiguration.mockResolvedValue({ success: true });
      databaseOperations.getUserWorkflow.mockResolvedValue(mockWorkflow);
      databaseOperations.logUserActivity.mockResolvedValue({ success: true });
      scheduler.updateWorkflow.mockResolvedValue(mockWorkflowResult);

      await request(app)
        .post('/api/workflows/reconfigure')
        .set('Authorization', `Bearer ${authToken}`)
        .send(requestData);

      expect(databaseOperations.logUserActivity).toHaveBeenCalledWith(
        userId,
        'WORKFLOW_RECONFIGURED',
        {
          workflowId: 'workflow-123',
          emailProvider: 'gmail',
          businessTypeId: 1,
          businessTypeName: 'Hot Tub Services'
        }
      );
    });

    test('should handle activity logging failure gracefully', async () => {
      const requestData = {
        emailProvider: 'gmail',
        businessTypeId: 1,
        customSettings: {}
      };

      const mockBusinessType = {
        data: {
          id: 1,
          name: 'Hot Tub Services',
          workflow_template: 'hot-tub-template'
        }
      };

      const mockWorkflow = {
        data: {
          workflow_id: 'workflow-123',
          status: 'active'
        }
      };

      const mockWorkflowResult = {
        success: true,
        workflowId: 'workflow-123'
      };

      databaseOperations.getBusinessTypeById.mockResolvedValue(mockBusinessType);
      databaseOperations.updateUserConfiguration.mockResolvedValue({ success: true });
      databaseOperations.getUserWorkflow.mockResolvedValue(mockWorkflow);
      databaseOperations.logUserActivity.mockRejectedValue(new Error('Logging failed'));
      scheduler.updateWorkflow.mockResolvedValue(mockWorkflowResult);

      const response = await request(app)
        .post('/api/workflows/reconfigure')
        .set('Authorization', `Bearer ${authToken}`)
        .send(requestData);

      // Should still succeed even if logging fails
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Authentication', () => {
    test('should require authentication', async () => {
      const response = await request(app)
        .post('/api/workflows/reconfigure')
        .send({
          emailProvider: 'gmail',
          businessTypeId: 1
        });

      expect(response.status).toBe(401);
    });

    test('should require valid token format', async () => {
      const response = await request(app)
        .post('/api/workflows/reconfigure')
        .set('Authorization', 'InvalidToken')
        .send({
          emailProvider: 'gmail',
          businessTypeId: 1
        });

      expect(response.status).toBe(401);
    });
  });

  describe('Input Validation', () => {
    test('should handle empty request body', async () => {
      const response = await request(app)
        .post('/api/workflows/reconfigure')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Email provider and business type are required');
    });

    test('should handle null values', async () => {
      const response = await request(app)
        .post('/api/workflows/reconfigure')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          emailProvider: null,
          businessTypeId: null
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Email provider and business type are required');
    });

    test('should handle undefined values', async () => {
      const response = await request(app)
        .post('/api/workflows/reconfigure')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          emailProvider: undefined,
          businessTypeId: undefined
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Email provider and business type are required');
    });

    test('should handle empty strings', async () => {
      const response = await request(app)
        .post('/api/workflows/reconfigure')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          emailProvider: '',
          businessTypeId: 1
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Email provider and business type are required');
    });
  });
});
