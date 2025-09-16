/**
 * Onboarding Completion Validator
 * Ensures all steps are complete before marking onboarding as finished
 */

const { databaseOperations } = require('./backend/database/database-operations');
const n8nService = require('./backend/services/n8nService');
const recoverySystem = require('./n8n-deployment-recovery-system');
const emailService = require('./backend/services/emailService');

class OnboardingCompletionValidator {
  constructor() {
    this.requiredSteps = [
      'email_verified',
      'business_type_selected', 
      'gmail_connected',
      'business_info_provided',
      'n8n_deployed',
      'automation_tested',
      'first_execution_successful'
    ];
  }

  /**
   * Validate complete onboarding process
   */
  async validateOnboardingCompletion(userId) {
    try {
      console.log(`🔍 Validating onboarding completion for user ${userId}`);
      
      const validation = {
        userId,
        timestamp: new Date().toISOString(),
        steps: {},
        overall: false,
        readyForCompletion: false
      };

      // Step 1: Email Verification
      validation.steps.email_verified = await this.validateEmailVerification(userId);
      
      // Step 2: Business Type Selection
      validation.steps.business_type_selected = await this.validateBusinessTypeSelection(userId);
      
      // Step 3: Gmail Connection
      validation.steps.gmail_connected = await this.validateGmailConnection(userId);
      
      // Step 4: Business Information
      validation.steps.business_info_provided = await this.validateBusinessInfo(userId);
      
      // Step 5: N8N Deployment
      validation.steps.n8n_deployed = await this.validateN8NDeployment(userId);
      
      // Step 6: Automation Testing
      validation.steps.automation_tested = await this.validateAutomationTesting(userId);
      
      // Step 7: First Execution (5-minute test)
      validation.steps.first_execution_successful = await this.validateFirstExecution(userId);

      // Calculate overall completion
      const completedSteps = Object.values(validation.steps).filter(step => step.completed).length;
      const totalSteps = this.requiredSteps.length;
      
      validation.completionRate = Math.round((completedSteps / totalSteps) * 100);
      validation.overall = completedSteps === totalSteps;
      validation.readyForCompletion = validation.overall;

      // If all steps complete, mark onboarding as finished
      if (validation.overall) {
        await this.completeOnboarding(userId, validation);
      }

      return validation;
      
    } catch (error) {
      console.error('Onboarding validation error:', error);
      return {
        userId,
        error: error.message,
        overall: false,
        readyForCompletion: false
      };
    }
  }

  async validateEmailVerification(userId) {
    try {
      const user = await databaseOperations.getUserById(userId);
      const verified = user.data?.email_verified === true;
      
      return {
        completed: verified,
        message: verified ? 'Email verified successfully' : 'Email verification pending',
        data: { emailVerified: verified }
      };
    } catch (error) {
      return { completed: false, message: 'Email verification check failed', error: error.message };
    }
  }

  async validateBusinessTypeSelection(userId) {
    try {
      const config = await databaseOperations.getBusinessConfig(userId);
      const hasBusinessType = config.data?.business_type_id != null;
      
      return {
        completed: hasBusinessType,
        message: hasBusinessType ? 'Business type selected' : 'Business type selection pending',
        data: { businessTypeId: config.data?.business_type_id }
      };
    } catch (error) {
      return { completed: false, message: 'Business type check failed', error: error.message };
    }
  }

  async validateGmailConnection(userId) {
    try {
      // Check if user has valid Gmail OAuth tokens
      const oauthStatus = await databaseOperations.getOAuthStatus(userId);
      const connected = oauthStatus.data?.gmail_connected === true && 
                       oauthStatus.data?.oauth_status !== 'expired';
      
      return {
        completed: connected,
        message: connected ? 'Gmail connected successfully' : 'Gmail connection required',
        data: { 
          gmailConnected: connected,
          oauthStatus: oauthStatus.data?.oauth_status 
        }
      };
    } catch (error) {
      return { completed: false, message: 'Gmail connection check failed', error: error.message };
    }
  }

  async validateBusinessInfo(userId) {
    try {
      const config = await databaseOperations.getBusinessConfig(userId);
      const hasRequiredInfo = config.data?.business_name && 
                             config.data?.business_address &&
                             config.data?.business_phone;
      
      return {
        completed: !!hasRequiredInfo,
        message: hasRequiredInfo ? 'Business information complete' : 'Business information incomplete',
        data: { 
          hasBusinessName: !!config.data?.business_name,
          hasBusinessAddress: !!config.data?.business_address,
          hasBusinessPhone: !!config.data?.business_phone
        }
      };
    } catch (error) {
      return { completed: false, message: 'Business info check failed', error: error.message };
    }
  }

  async validateN8NDeployment(userId) {
    try {
      const workflows = await n8nService.getUserWorkflows(userId);
      const deployed = workflows.length > 0 && workflows[0].workflow_status === 'deployed';
      
      return {
        completed: deployed,
        message: deployed ? 'N8N workflow deployed successfully' : 'N8N deployment pending',
        data: { 
          workflowCount: workflows.length,
          workflowId: workflows[0]?.n8n_workflow_id 
        }
      };
    } catch (error) {
      return { completed: false, message: 'N8N deployment check failed', error: error.message };
    }
  }

  async validateAutomationTesting(userId) {
    try {
      const workflows = await n8nService.getUserWorkflows(userId);
      if (workflows.length === 0) {
        return { completed: false, message: 'No workflow to test' };
      }

      const workflowId = workflows[0].n8n_workflow_id;
      const testResult = await recoverySystem.testDeployedWorkflow(workflowId, userId);
      
      return {
        completed: testResult.success,
        message: testResult.success ? 'Automation test passed' : 'Automation test failed',
        data: { 
          testExecutionId: testResult.executionId,
          testStatus: testResult.status 
        }
      };
    } catch (error) {
      return { completed: false, message: 'Automation testing failed', error: error.message };
    }
  }

  async validateFirstExecution(userId) {
    try {
      const workflows = await n8nService.getUserWorkflows(userId);
      if (workflows.length === 0) {
        return { completed: false, message: 'No workflow deployed' };
      }

      const workflowId = workflows[0].n8n_workflow_id;
      
      // Check for executions in the last 10 minutes (allowing for 5-minute interval + buffer)
      const recentExecutions = await n8nService.getRecentExecutions(workflowId, 0.17); // 10 minutes in hours
      
      const hasRecentExecution = recentExecutions.length > 0;
      
      return {
        completed: hasRecentExecution,
        message: hasRecentExecution ? 
          'First automation execution successful' : 
          'Waiting for first automation execution (5-minute interval)',
        data: { 
          recentExecutions: recentExecutions.length,
          lastExecution: recentExecutions[0]?.startedAt 
        }
      };
    } catch (error) {
      return { completed: false, message: 'First execution check failed', error: error.message };
    }
  }

  /**
   * Complete onboarding process
   */
  async completeOnboarding(userId, validation) {
    try {
      console.log(`🎉 Completing onboarding for user ${userId}`);
      
      // Update user status
      await databaseOperations.updateUserStatus(userId, {
        onboarding_completed: true,
        onboarding_completed_at: new Date().toISOString(),
        automation_status: 'active'
      });

      // Send completion email
      const user = await databaseOperations.getUserById(userId);
      if (user.data) {
        await emailService.sendEmail({
          to: user.data.email,
          subject: '🎉 Your FloWorx Email Automation is Now Active!',
          template: 'onboarding-complete',
          data: {
            firstName: user.data.first_name,
            dashboardUrl: `${process.env.FRONTEND_URL}/dashboard`,
            statusUrl: `${process.env.FRONTEND_URL}/automation-status`
          }
        });
      }

      // Log completion
      console.log(`✅ Onboarding completed successfully for user ${userId}`);
      
      return { success: true, completedAt: new Date().toISOString() };
      
    } catch (error) {
      console.error('Onboarding completion error:', error);
      throw error;
    }
  }

  /**
   * Get onboarding progress for dashboard
   */
  async getOnboardingProgress(userId) {
    const validation = await this.validateOnboardingCompletion(userId);
    
    return {
      userId,
      completionRate: validation.completionRate || 0,
      isComplete: validation.overall || false,
      steps: validation.steps || {},
      nextStep: this.getNextStep(validation.steps || {}),
      timestamp: validation.timestamp
    };
  }

  getNextStep(steps) {
    for (const stepName of this.requiredSteps) {
      if (!steps[stepName]?.completed) {
        return {
          step: stepName,
          message: this.getStepMessage(stepName)
        };
      }
    }
    return null;
  }

  getStepMessage(stepName) {
    const messages = {
      'email_verified': 'Please verify your email address',
      'business_type_selected': 'Select your business type',
      'gmail_connected': 'Connect your Gmail account',
      'business_info_provided': 'Complete your business information',
      'n8n_deployed': 'Deploy your email automation',
      'automation_tested': 'Test your automation',
      'first_execution_successful': 'Wait for first automation run (5 minutes)'
    };
    return messages[stepName] || 'Complete this step';
  }
}

module.exports = new OnboardingCompletionValidator();
