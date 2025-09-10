/**
 * Unit Tests for n8nScheduler Service
 * Tests workflow scheduling, execution, and management
 */

const axios = require('axios');

const n8nScheduler = require('../../../services/n8nScheduler');

// Mock dependencies
jest.mock('axios');
jest.mock('../../../utils/logger');
jest.mock('../../../database/unified-connection');

describe('n8nScheduler Service', () => {
  const mockAxios = axios;
  const mockWorkflow = {
    id: 'test-workflow-id',
    name: 'Test Workflow',
    nodes: [
      {
        id: 'start',
        type: 'n8n-nodes-base.start',
        position: [100, 100]
      },
      {
        id: 'gmail',
        type: 'n8n-nodes-base.gmail',
        position: [300, 100],
        parameters: {
          operation: 'getAll'
        }
      }
    ],
    connections: {
      start: {
        main: [
          [
            {
              node: 'gmail',
              type: 'main',
              index: 0
            }
          ]
        ]
      }
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful axios responses by default
    mockAxios.get.mockResolvedValue({ data: { data: [] } });
    mockAxios.post.mockResolvedValue({ data: { data: mockWorkflow } });
    mockAxios.put.mockResolvedValue({ data: { data: mockWorkflow } });
    mockAxios.delete.mockResolvedValue({ data: { success: true } });
  });

  describe('Workflow Creation', () => {
    test('should create workflow successfully', async () => {
      const workflowData = {
        name: 'Test Workflow',
        nodes: mockWorkflow.nodes,
        connections: mockWorkflow.connections
      };

      const result = await n8nScheduler.createWorkflow(workflowData);

      expect(mockAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/workflows'),
        expect.objectContaining({
          name: workflowData.name,
          nodes: workflowData.nodes,
          connections: workflowData.connections
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-N8N-API-KEY': expect.any(String)
          })
        })
      );

      expect(result).toEqual(mockWorkflow);
    });

    test('should handle workflow creation failure', async () => {
      const error = new Error('N8N API Error');
      mockAxios.post.mockRejectedValue(error);

      const workflowData = {
        name: 'Test Workflow',
        nodes: [],
        connections: {}
      };

      await expect(n8nScheduler.createWorkflow(workflowData))
        .rejects.toThrow('Failed to create workflow');
    });

    test('should validate workflow data before creation', async () => {
      const invalidWorkflowData = {
        // Missing required fields
      };

      await expect(n8nScheduler.createWorkflow(invalidWorkflowData))
        .rejects.toThrow('Invalid workflow data');
    });
  });

  describe('Workflow Execution', () => {
    test('should execute workflow successfully', async () => {
      const executionResult = {
        id: 'execution-123',
        workflowId: 'workflow-456',
        status: 'success',
        data: {
          resultData: {
            runData: {
              gmail: [
                {
                  data: {
                    main: [
                      [
                        {
                          json: { subject: 'Test Email', from: 'test@example.com' }
                        }
                      ]
                    ]
                  }
                }
              ]
            }
          }
        }
      };

      mockAxios.post.mockResolvedValue({ data: { data: executionResult } });

      const result = await n8nScheduler.executeWorkflow('workflow-456', {
        inputData: { test: 'data' }
      });

      expect(mockAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/workflows/workflow-456/execute'),
        expect.objectContaining({
          inputData: { test: 'data' }
        }),
        expect.any(Object)
      );

      expect(result).toEqual(executionResult);
    });

    test('should handle workflow execution failure', async () => {
      const error = new Error('Execution failed');
      mockAxios.post.mockRejectedValue(error);

      await expect(n8nScheduler.executeWorkflow('workflow-456'))
        .rejects.toThrow('Failed to execute workflow');
    });

    test('should track execution status', async () => {
      const executionId = 'execution-123';
      const statusResult = {
        id: executionId,
        status: 'running',
        startedAt: new Date().toISOString()
      };

      mockAxios.get.mockResolvedValue({ data: { data: statusResult } });

      const result = await n8nScheduler.getExecutionStatus(executionId);

      expect(mockAxios.get).toHaveBeenCalledWith(
        expect.stringContaining(`/executions/${executionId}`),
        expect.any(Object)
      );

      expect(result).toEqual(statusResult);
    });
  });

  describe('Workflow Management', () => {
    test('should list workflows', async () => {
      const workflows = [mockWorkflow];
      mockAxios.get.mockResolvedValue({ data: { data: workflows } });

      const result = await n8nScheduler.listWorkflows();

      expect(mockAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/workflows'),
        expect.any(Object)
      );

      expect(result).toEqual(workflows);
    });

    test('should get workflow by ID', async () => {
      mockAxios.get.mockResolvedValue({ data: { data: mockWorkflow } });

      const result = await n8nScheduler.getWorkflow('test-workflow-id');

      expect(mockAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/workflows/test-workflow-id'),
        expect.any(Object)
      );

      expect(result).toEqual(mockWorkflow);
    });

    test('should update workflow', async () => {
      const updateData = {
        name: 'Updated Workflow',
        active: true
      };

      mockAxios.put.mockResolvedValue({ 
        data: { data: { ...mockWorkflow, ...updateData } } 
      });

      const result = await n8nScheduler.updateWorkflow('test-workflow-id', updateData);

      expect(mockAxios.put).toHaveBeenCalledWith(
        expect.stringContaining('/workflows/test-workflow-id'),
        updateData,
        expect.any(Object)
      );

      expect(result.name).toBe(updateData.name);
      expect(result.active).toBe(updateData.active);
    });

    test('should delete workflow', async () => {
      mockAxios.delete.mockResolvedValue({ data: { success: true } });

      const result = await n8nScheduler.deleteWorkflow('test-workflow-id');

      expect(mockAxios.delete).toHaveBeenCalledWith(
        expect.stringContaining('/workflows/test-workflow-id'),
        expect.any(Object)
      );

      expect(result.success).toBe(true);
    });
  });

  describe('Workflow Scheduling', () => {
    test('should schedule workflow with cron expression', async () => {
      const scheduleData = {
        workflowId: 'test-workflow-id',
        cronExpression: '0 9 * * *', // Daily at 9 AM
        timezone: 'America/New_York'
      };

      const result = await n8nScheduler.scheduleWorkflow(scheduleData);

      expect(result).toHaveProperty('scheduleId');
      expect(result.workflowId).toBe(scheduleData.workflowId);
      expect(result.cronExpression).toBe(scheduleData.cronExpression);
    });

    test('should validate cron expression', async () => {
      const invalidScheduleData = {
        workflowId: 'test-workflow-id',
        cronExpression: 'invalid-cron'
      };

      await expect(n8nScheduler.scheduleWorkflow(invalidScheduleData))
        .rejects.toThrow('Invalid cron expression');
    });

    test('should unschedule workflow', async () => {
      const scheduleId = 'schedule-123';

      const result = await n8nScheduler.unscheduleWorkflow(scheduleId);

      expect(result.success).toBe(true);
    });
  });

  describe('Webhook Management', () => {
    test('should create webhook for workflow', async () => {
      const webhookData = {
        workflowId: 'test-workflow-id',
        path: 'test-webhook',
        method: 'POST'
      };

      const webhookResult = {
        id: 'webhook-123',
        url: 'https://n8n.example.com/webhook/test-webhook',
        ...webhookData
      };

      mockAxios.post.mockResolvedValue({ data: { data: webhookResult } });

      const result = await n8nScheduler.createWebhook(webhookData);

      expect(result).toEqual(webhookResult);
    });

    test('should list webhooks for workflow', async () => {
      const webhooks = [
        {
          id: 'webhook-123',
          workflowId: 'test-workflow-id',
          path: 'test-webhook'
        }
      ];

      mockAxios.get.mockResolvedValue({ data: { data: webhooks } });

      const result = await n8nScheduler.listWebhooks('test-workflow-id');

      expect(result).toEqual(webhooks);
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors gracefully', async () => {
      const networkError = new Error('Network Error');
      networkError.code = 'ECONNREFUSED';
      mockAxios.get.mockRejectedValue(networkError);

      await expect(n8nScheduler.listWorkflows())
        .rejects.toThrow('N8N service unavailable');
    });

    test('should handle authentication errors', async () => {
      const authError = new Error('Unauthorized');
      authError.response = { status: 401 };
      mockAxios.get.mockRejectedValue(authError);

      await expect(n8nScheduler.listWorkflows())
        .rejects.toThrow('N8N authentication failed');
    });

    test('should handle rate limiting', async () => {
      const rateLimitError = new Error('Too Many Requests');
      rateLimitError.response = { status: 429 };
      mockAxios.get.mockRejectedValue(rateLimitError);

      await expect(n8nScheduler.listWorkflows())
        .rejects.toThrow('N8N rate limit exceeded');
    });
  });

  describe('Configuration', () => {
    test('should validate N8N configuration', () => {
      const config = n8nScheduler.getConfiguration();

      expect(config).toHaveProperty('baseURL');
      expect(config).toHaveProperty('apiKey');
      expect(config).toHaveProperty('timeout');
    });

    test('should update configuration', () => {
      const newConfig = {
        timeout: 10000,
        retryAttempts: 5
      };

      n8nScheduler.updateConfiguration(newConfig);
      const config = n8nScheduler.getConfiguration();

      expect(config.timeout).toBe(newConfig.timeout);
      expect(config.retryAttempts).toBe(newConfig.retryAttempts);
    });
  });

  describe('Performance', () => {
    test('should complete workflow creation within reasonable time', async () => {
      const startTime = Date.now();
      
      await n8nScheduler.createWorkflow({
        name: 'Performance Test',
        nodes: mockWorkflow.nodes,
        connections: mockWorkflow.connections
      });
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    test('should handle concurrent workflow executions', async () => {
      const promises = Array(5).fill().map((_, index) => 
        n8nScheduler.executeWorkflow(`workflow-${index}`)
      );

      const results = await Promise.all(promises);
      expect(results).toHaveLength(5);
    });
  });

  describe('Integration Scenarios', () => {
    test('should create and execute Gmail workflow', async () => {
      const gmailWorkflow = {
        name: 'Gmail Integration Test',
        nodes: [
          {
            id: 'start',
            type: 'n8n-nodes-base.start',
            position: [100, 100]
          },
          {
            id: 'gmail',
            type: 'n8n-nodes-base.gmail',
            position: [300, 100],
            parameters: {
              operation: 'getAll',
              filters: {
                labelIds: ['INBOX']
              }
            }
          }
        ],
        connections: {
          start: {
            main: [[{ node: 'gmail', type: 'main', index: 0 }]]
          }
        }
      };

      // Create workflow
      const createdWorkflow = await n8nScheduler.createWorkflow(gmailWorkflow);
      expect(createdWorkflow).toHaveProperty('id');

      // Execute workflow
      const execution = await n8nScheduler.executeWorkflow(createdWorkflow.id);
      expect(execution).toHaveProperty('status');
    });

    test('should handle workflow with multiple nodes', async () => {
      const complexWorkflow = {
        name: 'Complex Workflow Test',
        nodes: [
          { id: 'start', type: 'n8n-nodes-base.start', position: [100, 100] },
          { id: 'gmail', type: 'n8n-nodes-base.gmail', position: [300, 100] },
          { id: 'filter', type: 'n8n-nodes-base.filter', position: [500, 100] },
          { id: 'webhook', type: 'n8n-nodes-base.webhook', position: [700, 100] }
        ],
        connections: {
          start: { main: [[{ node: 'gmail', type: 'main', index: 0 }]] },
          gmail: { main: [[{ node: 'filter', type: 'main', index: 0 }]] },
          filter: { main: [[{ node: 'webhook', type: 'main', index: 0 }]] }
        }
      };

      const result = await n8nScheduler.createWorkflow(complexWorkflow);
      expect(result.nodes).toHaveLength(4);
    });
  });
});
