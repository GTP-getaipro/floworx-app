/**
 * N8N Deployment Recovery System
 * Handles failures, retries, and monitoring for FloWorx automations
 */

const { databaseOperations } = require('./backend/database/database-operations');
const n8nService = require('./backend/services/n8nService');
const emailService = require('./backend/services/emailService');

class N8NDeploymentRecoverySystem {
  constructor() {
    this.maxRetries = 3;
    this.retryDelays = [5000, 15000, 30000]; // 5s, 15s, 30s
    this.monitoringInterval = 300000; // 5 minutes
  }

  /**
   * Deploy workflow with automatic retry mechanism
   */
  async deployWorkflowWithRetry(userId, config, attempt = 1) {
    try {
      console.log(`🚀 Attempting n8n deployment for user ${userId} (attempt ${attempt}/${this.maxRetries})`);
      
      // Test n8n connection first
      const healthCheck = await n8nService.testConnection();
      if (!healthCheck.connected) {
        throw new Error(`n8n service unavailable: ${healthCheck.error}`);
      }

      // Deploy workflow
      const result = await n8nService.createWorkflowFromTemplate(userId, config);
      
      // Test the deployed workflow
      const testResult = await this.testDeployedWorkflow(result.workflowId, userId);
      
      if (!testResult.success) {
        throw new Error(`Workflow test failed: ${testResult.error}`);
      }

      // Mark deployment as successful
      await this.markDeploymentSuccess(userId, result, testResult);
      
      console.log(`✅ n8n deployment successful for user ${userId}`);
      return {
        success: true,
        workflowId: result.workflowId,
        testResult: testResult
      };

    } catch (error) {
      console.error(`❌ n8n deployment failed for user ${userId} (attempt ${attempt}):`, error.message);
      
      // Record failure
      await this.recordDeploymentFailure(userId, error, attempt);
      
      // Retry if attempts remaining
      if (attempt < this.maxRetries) {
        const delay = this.retryDelays[attempt - 1];
        console.log(`⏳ Retrying in ${delay/1000} seconds...`);
        
        await this.delay(delay);
        return this.deployWorkflowWithRetry(userId, config, attempt + 1);
      }
      
      // All retries exhausted
      await this.handleFinalDeploymentFailure(userId, error);
      throw new Error(`n8n deployment failed after ${this.maxRetries} attempts: ${error.message}`);
    }
  }

  /**
   * Test deployed workflow with real email simulation
   */
  async testDeployedWorkflow(workflowId, userId) {
    try {
      // Test with realistic email data
      const testData = {
        test: true,
        subject: 'Test: Hot tub installation quote request',
        from: 'customer@example.com',
        body: 'Hi, I am interested in getting a quote for a new hot tub installation. Can you please provide pricing and availability?',
        timestamp: new Date().toISOString()
      };

      const testResult = await n8nService.testWorkflow(workflowId, testData);
      
      // Verify test execution was successful
      if (testResult.status === 'success' || testResult.status === 'completed') {
        return {
          success: true,
          executionId: testResult.executionId,
          status: testResult.status
        };
      } else {
        return {
          success: false,
          error: `Test execution failed with status: ${testResult.status}`
        };
      }
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * OAuth Token Recovery System
   */
  async handleOAuthTokenExpiration(userId) {
    try {
      console.log(`🔄 Handling OAuth token expiration for user ${userId}`);
      
      // Mark user as needing re-authentication
      await databaseOperations.updateUserStatus(userId, {
        oauth_status: 'expired',
        automation_status: 'paused',
        needs_reauth: true
      });

      // Send re-authentication email
      const user = await databaseOperations.getUserById(userId);
      if (user.data) {
        await emailService.sendEmail({
          to: user.data.email,
          subject: 'FloWorx: Please Re-authorize Your Gmail Connection',
          template: 'oauth-reauth',
          data: {
            firstName: user.data.first_name,
            reAuthUrl: `${process.env.FRONTEND_URL}/reauthorize?user=${userId}`
          }
        });
      }

      return { success: true, action: 'reauth_required' };
      
    } catch (error) {
      console.error('OAuth recovery error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Automation Health Monitoring
   */
  async monitorAutomationHealth(userId) {
    try {
      const workflows = await n8nService.getUserWorkflows(userId);
      
      for (const workflow of workflows) {
        // Check if workflow is still active
        const status = await n8nService.getWorkflowStatus(workflow.n8n_workflow_id);
        
        if (status.active === false) {
          console.log(`⚠️ Workflow ${workflow.n8n_workflow_id} is inactive for user ${userId}`);
          await this.handleInactiveWorkflow(userId, workflow);
        }
        
        // Check recent executions
        const recentExecutions = await n8nService.getRecentExecutions(workflow.n8n_workflow_id, 24); // Last 24 hours
        
        if (recentExecutions.length === 0) {
          console.log(`⚠️ No recent executions for workflow ${workflow.n8n_workflow_id} (user ${userId})`);
          await this.handleStaleWorkflow(userId, workflow);
        }
      }
      
      return { success: true, monitored: workflows.length };
      
    } catch (error) {
      console.error('Monitoring error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Client Dashboard Status Updates
   */
  async getAutomationStatus(userId) {
    try {
      const workflows = await n8nService.getUserWorkflows(userId);
      const user = await databaseOperations.getUserById(userId);
      
      if (workflows.length === 0) {
        return {
          status: 'not_deployed',
          message: 'Automation not yet deployed',
          action_required: 'complete_onboarding'
        };
      }

      const workflow = workflows[0]; // Primary workflow
      const n8nStatus = await n8nService.getWorkflowStatus(workflow.n8n_workflow_id);
      const recentExecutions = await n8nService.getRecentExecutions(workflow.n8n_workflow_id, 24);
      
      // Determine overall status
      let status = 'unknown';
      let message = '';
      let actionRequired = null;
      
      if (!n8nStatus.active) {
        status = 'inactive';
        message = 'Automation is currently inactive';
        actionRequired = 'contact_support';
      } else if (user.data?.oauth_status === 'expired') {
        status = 'auth_expired';
        message = 'Gmail authorization has expired';
        actionRequired = 'reauthorize_gmail';
      } else if (recentExecutions.length > 0) {
        status = 'active';
        message = `Processing emails every 5 minutes. Last processed: ${recentExecutions[0].startedAt}`;
      } else {
        status = 'waiting';
        message = 'Automation is active and waiting for emails to process';
      }

      return {
        status,
        message,
        action_required: actionRequired,
        workflow_id: workflow.n8n_workflow_id,
        last_execution: recentExecutions[0]?.startedAt || null,
        executions_24h: recentExecutions.length
      };
      
    } catch (error) {
      return {
        status: 'error',
        message: 'Unable to check automation status',
        error: error.message
      };
    }
  }

  // Helper methods
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async markDeploymentSuccess(userId, result, testResult) {
    await databaseOperations.updateUserStatus(userId, {
      onboarding_completed: true,
      automation_status: 'active',
      workflow_id: result.workflowId,
      deployment_completed_at: new Date().toISOString()
    });
  }

  async recordDeploymentFailure(userId, error, attempt) {
    await databaseOperations.logDeploymentFailure(userId, {
      error: error.message,
      attempt: attempt,
      timestamp: new Date().toISOString()
    });
  }

  async handleFinalDeploymentFailure(userId, error) {
    // Mark user as needing manual intervention
    await databaseOperations.updateUserStatus(userId, {
      automation_status: 'failed',
      needs_manual_intervention: true,
      last_error: error.message
    });

    // Notify support team
    await emailService.sendEmail({
      to: process.env.SUPPORT_EMAIL || 'support@floworx-iq.com',
      subject: `FloWorx: Manual Intervention Required - User ${userId}`,
      html: `
        <h3>Deployment Failure Alert</h3>
        <p><strong>User ID:</strong> ${userId}</p>
        <p><strong>Error:</strong> ${error.message}</p>
        <p><strong>Action Required:</strong> Manual deployment assistance needed</p>
      `
    });
  }

  async handleInactiveWorkflow(userId, workflow) {
    // Try to reactivate
    try {
      await n8nService.activateWorkflow(workflow.n8n_workflow_id);
      console.log(`✅ Reactivated workflow ${workflow.n8n_workflow_id} for user ${userId}`);
    } catch (error) {
      console.error(`❌ Failed to reactivate workflow: ${error.message}`);
      await this.handleOAuthTokenExpiration(userId);
    }
  }

  async handleStaleWorkflow(userId, workflow) {
    // Check if it's an OAuth issue
    const user = await databaseOperations.getUserById(userId);
    if (user.data?.oauth_status !== 'expired') {
      // Workflow might be working but no emails to process - this is normal
      console.log(`ℹ️ Workflow ${workflow.n8n_workflow_id} has no recent executions but OAuth is valid`);
    }
  }
}

module.exports = new N8NDeploymentRecoverySystem();
