/**
 * n8n Scheduler Service
 * Handles scheduling and management of n8n workflows
 */

const axios = require('axios');
const { logger } = require('../utils/logger');

class N8nScheduler {
  constructor() {
    this.baseUrl = process.env.N8N_BASE_URL || 'http://localhost:5678';
    this.apiKey = process.env.N8N_API_KEY;
    this.scheduledWorkflows = new Map();
  }

  /**
   * Initialize the scheduler
   */
  async initialize() {
    try {
      logger.info('Initializing n8n Scheduler');
      
      // Test connection to n8n
      if (this.apiKey) {
        await this.testConnection();
      } else {
        logger.warn('N8N_API_KEY not configured - scheduler will run in mock mode');
      }
      
      return { success: true };
    } catch (error) {
      logger.error('Failed to initialize n8n Scheduler', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Test connection to n8n instance
   */
  async testConnection() {
    try {
      const response = await axios.get(`${this.baseUrl}/api/v1/workflows`, {
        headers: {
          'X-N8N-API-KEY': this.apiKey
        },
        timeout: 5000
      });

      logger.info('n8n connection test successful', { 
        workflowCount: response.data?.data?.length || 0 
      });
      
      return { success: true, workflowCount: response.data?.data?.length || 0 };
    } catch (error) {
      logger.error('n8n connection test failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Schedule a workflow to run
   */
  async scheduleWorkflow(workflowId, schedule, options = {}) {
    try {
      logger.info('Scheduling workflow', { workflowId, schedule });

      if (!this.apiKey) {
        // Mock mode
        this.scheduledWorkflows.set(workflowId, {
          schedule,
          options,
          status: 'scheduled',
          createdAt: new Date()
        });
        
        return { 
          success: true, 
          workflowId, 
          schedule,
          mode: 'mock'
        };
      }

      // Real n8n scheduling would go here
      const response = await axios.post(`${this.baseUrl}/api/v1/workflows/${workflowId}/activate`, {
        active: true
      }, {
        headers: {
          'X-N8N-API-KEY': this.apiKey,
          'Content-Type': 'application/json'
        }
      });

      this.scheduledWorkflows.set(workflowId, {
        schedule,
        options,
        status: 'active',
        createdAt: new Date(),
        n8nResponse: response.data
      });

      return { 
        success: true, 
        workflowId, 
        schedule,
        status: 'active'
      };
    } catch (error) {
      logger.error('Failed to schedule workflow', { 
        workflowId, 
        error: error.message 
      });
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  /**
   * Unschedule a workflow
   */
  async unscheduleWorkflow(workflowId) {
    try {
      logger.info('Unscheduling workflow', { workflowId });

      if (!this.apiKey) {
        // Mock mode
        this.scheduledWorkflows.delete(workflowId);
        return { 
          success: true, 
          workflowId,
          mode: 'mock'
        };
      }

      // Real n8n unscheduling
      await axios.post(`${this.baseUrl}/api/v1/workflows/${workflowId}/activate`, {
        active: false
      }, {
        headers: {
          'X-N8N-API-KEY': this.apiKey,
          'Content-Type': 'application/json'
        }
      });

      this.scheduledWorkflows.delete(workflowId);

      return { 
        success: true, 
        workflowId,
        status: 'inactive'
      };
    } catch (error) {
      logger.error('Failed to unschedule workflow', { 
        workflowId, 
        error: error.message 
      });
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  /**
   * Get scheduled workflows
   */
  getScheduledWorkflows() {
    return Array.from(this.scheduledWorkflows.entries()).map(([id, data]) => ({
      workflowId: id,
      ...data
    }));
  }

  /**
   * Get workflow status
   */
  async getWorkflowStatus(workflowId) {
    try {
      if (!this.apiKey) {
        // Mock mode
        const workflow = this.scheduledWorkflows.get(workflowId);
        return {
          success: true,
          workflowId,
          status: workflow ? workflow.status : 'not_found',
          mode: 'mock'
        };
      }

      const response = await axios.get(`${this.baseUrl}/api/v1/workflows/${workflowId}`, {
        headers: {
          'X-N8N-API-KEY': this.apiKey
        }
      });

      return {
        success: true,
        workflowId,
        status: response.data.active ? 'active' : 'inactive',
        workflow: response.data
      };
    } catch (error) {
      logger.error('Failed to get workflow status', { 
        workflowId, 
        error: error.message 
      });
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Execute workflow immediately
   */
  async executeWorkflow(workflowId, data = {}) {
    try {
      logger.info('Executing workflow', { workflowId });

      if (!this.apiKey) {
        // Mock mode
        return {
          success: true,
          workflowId,
          executionId: `mock-${Date.now()}`,
          mode: 'mock',
          data
        };
      }

      const response = await axios.post(`${this.baseUrl}/api/v1/workflows/${workflowId}/execute`, {
        data
      }, {
        headers: {
          'X-N8N-API-KEY': this.apiKey,
          'Content-Type': 'application/json'
        }
      });

      return {
        success: true,
        workflowId,
        executionId: response.data.executionId,
        status: 'running'
      };
    } catch (error) {
      logger.error('Failed to execute workflow', { 
        workflowId, 
        error: error.message 
      });
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Create singleton instance
const n8nScheduler = new N8nScheduler();

module.exports = n8nScheduler;
