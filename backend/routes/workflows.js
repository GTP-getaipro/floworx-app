const express = require('express');

const { query } = require('../database/unified-connection');
const { authenticateToken } = require('../middleware/auth');
const { databaseOperations } = require('../database/database-operations');
const { scheduler } = require('../scheduler/n8nScheduler');
const n8nService = require('../services/n8nService');
const onboardingSessionService = require('../services/onboardingSessionService');
const transactionService = require('../services/transactionService');
const logger = require('../utils/logger');

const router = express.Router();

// GET /api/workflows
// Get user workflows
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user workflows from database
    const workflowsQuery = `
      SELECT
        id,
        user_id,
        n8n_workflow_id,
        name,
        status,
        created_at,
        updated_at,
        business_type,
        configuration
      FROM user_workflows
      WHERE user_id = $1
      ORDER BY created_at DESC
    `;
    const workflowsResult = await query(workflowsQuery, [userId]);

    res.json({
      success: true,
      workflows: workflowsResult.rows || [],
      count: workflowsResult.rows?.length || 0,
      message: 'Workflows retrieved successfully'
    });
  } catch (error) {
    console.error('Workflows error:', error);
    res.status(500).json({
      error: 'Failed to get workflows',
      message: error.message
    });
  }
});

// GET /api/workflows/health
// Check n8n service health
router.get('/health', authenticateToken, async (req, res) => {
  try {
    const health = await n8nService.testConnection();

    res.json({
      success: true,
      n8n: health
    });
  } catch (error) {
    console.error('Error checking n8n health:', error);
    res.status(500).json({
      error: 'Health check failed',
      message: error.message
    });
  }
});

// POST /api/workflows/deploy
// Deploy workflow for user based on onboarding configuration
router.post('/deploy', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const transactionId = `workflow-deploy-${userId}-${Date.now()}`;

  try {
    // Get user's onboarding configuration
    const configQuery = `
      SELECT step_completed, step_data 
      FROM user_onboarding_status 
      WHERE user_id = $1 
      ORDER BY completed_at DESC
    `;

    const configResult = await query(configQuery, [userId]);

    if (configResult.rows.length === 0) {
      return res.status(400).json({
        error: 'Incomplete onboarding',
        message: 'Please complete onboarding before deploying workflows'
      });
    }

    // Build configuration from onboarding data
    const config = {};
    configResult.rows.forEach(row => {
      config[row.step_completed] = row.step_data;
    });

    // Validate required configuration
    if (!config['business-categories'] || !config['business-categories'].categories) {
      return res.status(400).json({
        error: 'Missing business categories',
        message: 'Business categories are required for workflow deployment'
      });
    }

    // Check if user has Google OAuth connection
    const oauthQuery = 'SELECT id FROM credentials WHERE user_id = $1 AND service_name = $2';
    const oauthResult = await query(oauthQuery, [userId, 'google']);

    if (oauthResult.rows.length === 0) {
      return res.status(400).json({
        error: 'Missing Google connection',
        message: 'Please connect your Google account before deploying workflows'
      });
    }

    // Start transaction
    const transaction = await transactionService.startTransaction(transactionId);

    try {
      // Create session checkpoint
      await onboardingSessionService.createOrResumeSession(userId, 'workflow-deployment');

      // Test n8n connection first
      const healthCheck = await n8nService.testConnection();
      if (!healthCheck.connected) {
        throw new Error(`n8n service unavailable: ${healthCheck.error}`);
      }

      transaction.addOperation({
        type: 'n8n_health_check',
        description: 'Verify n8n service availability',
        result: healthCheck
      });

      // Get user's business type for template selection
      const userQuery = `
        SELECT u.business_type_id, bt.id, bt.name, bt.slug, bt.workflow_template_id
        FROM users u
        LEFT JOIN business_types bt ON u.business_type_id = bt.id
        WHERE u.id = $1
      `;
      const userResult = await query(userQuery, [userId]);
      const user = userResult.rows[0];

      if (!user || !user.business_type_id) {
        throw new Error('User business type not found. Please complete business type selection first.');
      }

      // Create workflow from template with business type context
      const workflowConfig = {
        businessType: user.business_types,
        businessCategories: config['business-categories'].categories,
        labelMappings: config['label-mapping']?.mappings || [],
        teamMembers: config['team-setup']?.members || []
      };

      const workflowResult = await n8nService.createWorkflowFromTemplate(userId, workflowConfig);

      transaction.addOperation({
        type: 'create_workflow',
        description: 'Create n8n workflow from template',
        workflowId: workflowResult.workflowId,
        workflowName: workflowResult.workflowName
      });

      // Test the workflow before activation
      const testResult = await n8nService.testWorkflow(workflowResult.workflowId, {
        test: true,
        subject: 'Test email for hot tub quote',
        from: 'test@example.com',
        body: 'I am interested in getting a quote for a new hot tub installation.'
      });

      transaction.addOperation({
        type: 'test_workflow',
        description: 'Test workflow execution',
        executionId: testResult.executionId,
        status: testResult.status
      });

      // Activate the workflow
      const activationResult = await n8nService.activateWorkflow(workflowResult.workflowId);

      transaction.addOperation({
        type: 'activate_workflow',
        description: 'Activate workflow for live processing',
        workflowId: workflowResult.workflowId,
        status: activationResult.status
      });

      // Update workflow deployment status
      await transaction.client.query(
        `
        UPDATE workflow_deployments 
        SET workflow_status = $1, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $2 AND n8n_workflow_id = $3
      `,
        ['active', userId, workflowResult.workflowId]
      );

      // Update onboarding status
      await transaction.client.query(
        `
        INSERT INTO user_onboarding_status (user_id, step_completed, step_data)
        VALUES ($1, $2, $3)
        ON CONFLICT (user_id, step_completed)
        DO UPDATE SET step_data = EXCLUDED.step_data, completed_at = CURRENT_TIMESTAMP
      `,
        [
          userId,
          'workflow-deployment',
          JSON.stringify({
            workflowId: workflowResult.workflowId,
            workflowName: workflowResult.workflowName,
            status: 'active',
            deployedAt: new Date()
          })
        ]
      );

      // Commit transaction
      await transaction.commit();

      // Save checkpoint
      await onboardingSessionService.saveCheckpoint(
        userId,
        'workflow-deployment',
        {
          workflowId: workflowResult.workflowId,
          workflowName: workflowResult.workflowName,
          webhookUrl: workflowResult.webhookUrl,
          status: 'active'
        },
        transactionId
      );

      res.json({
        success: true,
        deployment: {
          workflowId: workflowResult.workflowId,
          workflowName: workflowResult.workflowName,
          webhookUrl: workflowResult.webhookUrl,
          status: 'active',
          testExecution: {
            executionId: testResult.executionId,
            status: testResult.status
          }
        },
        message: 'Workflow deployed and activated successfully',
        transactionId
      });
    } catch (error) {
      await transaction.rollback();

      // Handle deployment failure
      await onboardingSessionService.handleStepFailure(userId, 'workflow-deployment', error, transactionId);

      throw error;
    }
  } catch (error) {
    console.error('Workflow deployment error:', error);
    res.status(500).json({
      error: 'Workflow deployment failed',
      message: error.message,
      transactionId,
      canRetry: true,
      suggestedAction: 'retry_deployment'
    });
  }
});

// GET /api/workflows/status
// Get user's workflow deployment status
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const workflows = await n8nService.getUserWorkflows(userId);

    // Get detailed status from n8n for each workflow
    const detailedWorkflows = await Promise.all(
      workflows.map(async workflow => {
        try {
          const healthCheck = await n8nService.testConnection();
          return {
            ...workflow,
            n8nStatus: healthCheck.connected ? 'connected' : 'disconnected',
            lastChecked: new Date()
          };
        } catch (error) {
          return {
            ...workflow,
            n8nStatus: 'error',
            error: error.message,
            lastChecked: new Date()
          };
        }
      })
    );

    res.json({
      success: true,
      workflows: detailedWorkflows,
      totalWorkflows: workflows.length
    });
  } catch (error) {
    console.error('Error getting workflow status:', error);
    res.status(500).json({
      error: 'Failed to get workflow status',
      message: error.message
    });
  }
});

// POST /api/workflows/:workflowId/test
// Test a specific workflow
router.post('/:workflowId/test', authenticateToken, async (req, res) => {
  try {
    const { workflowId } = req.params;
    const { testData } = req.body;
    const userId = req.user.id;

    // Verify user owns this workflow
    const ownershipQuery = `
      SELECT id FROM workflow_deployments 
      WHERE user_id = $1 AND n8n_workflow_id = $2
    `;
    const ownershipResult = await query(ownershipQuery, [userId, workflowId]);

    if (ownershipResult.rows.length === 0) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have access to this workflow'
      });
    }

    // Test the workflow
    const testResult = await n8nService.testWorkflow(
      workflowId,
      testData || {
        test: true,
        subject: 'Test email for workflow validation',
        from: 'test@floworx-iq.com',
        body: 'This is a test email to validate the workflow is working correctly.'
      }
    );

    res.json({
      success: true,
      test: testResult,
      message: 'Workflow test completed'
    });
  } catch (error) {
    console.error('Workflow test error:', error);
    res.status(500).json({
      error: 'Workflow test failed',
      message: error.message
    });
  }
});

// POST /api/workflows/:workflowId/activate
// Activate a workflow
router.post('/:workflowId/activate', authenticateToken, async (req, res) => {
  try {
    const { workflowId } = req.params;
    const userId = req.user.id;

    // Verify ownership
    const ownershipQuery = `
      SELECT id FROM workflow_deployments 
      WHERE user_id = $1 AND n8n_workflow_id = $2
    `;
    const ownershipResult = await query(ownershipQuery, [userId, workflowId]);

    if (ownershipResult.rows.length === 0) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have access to this workflow'
      });
    }

    // Activate workflow
    const result = await n8nService.activateWorkflow(workflowId);

    // Update database status
    await query(
      `
      UPDATE workflow_deployments
      SET workflow_status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $2 AND n8n_workflow_id = $3
    `,
      ['active', userId, workflowId]
    );

    res.json({
      success: true,
      activation: result,
      message: 'Workflow activated successfully'
    });
  } catch (error) {
    console.error('Workflow activation error:', error);
    res.status(500).json({
      error: 'Workflow activation failed',
      message: error.message
    });
  }
});

// POST /api/workflows/:workflowId/deactivate
// Deactivate a workflow
router.post('/:workflowId/deactivate', authenticateToken, async (req, res) => {
  try {
    const { workflowId } = req.params;
    const userId = req.user.id;

    // Verify ownership
    const ownershipQuery = `
      SELECT id FROM workflow_deployments 
      WHERE user_id = $1 AND n8n_workflow_id = $2
    `;
    const ownershipResult = await query(ownershipQuery, [userId, workflowId]);

    if (ownershipResult.rows.length === 0) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have access to this workflow'
      });
    }

    // Deactivate workflow
    const result = await n8nService.deactivateWorkflow(workflowId);

    // Update database status
    await query(
      `
      UPDATE workflow_deployments
      SET workflow_status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $2 AND n8n_workflow_id = $3
    `,
      ['inactive', userId, workflowId]
    );

    res.json({
      success: true,
      deactivation: result,
      message: 'Workflow deactivated successfully'
    });
  } catch (error) {
    console.error('Workflow deactivation error:', error);
    res.status(500).json({
      error: 'Workflow deactivation failed',
      message: error.message
    });
  }
});

// DELETE /api/workflows/:workflowId
// Delete a workflow (with rollback capability)
router.delete('/:workflowId', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const { workflowId } = req.params;
  const transactionId = `workflow-delete-${userId}-${workflowId}-${Date.now()}`;

  try {
    // Verify ownership
    const ownershipQuery = `
      SELECT id, workflow_name FROM workflow_deployments 
      WHERE user_id = $1 AND n8n_workflow_id = $2
    `;
    const ownershipResult = await query(ownershipQuery, [userId, workflowId]);

    if (ownershipResult.rows.length === 0) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have access to this workflow'
      });
    }

    const workflowName = ownershipResult.rows[0].workflow_name;

    // Start transaction
    const transaction = await transactionService.startTransaction(transactionId);

    try {
      // First deactivate the workflow
      await n8nService.deactivateWorkflow(workflowId);

      transaction.addOperation({
        type: 'deactivate_workflow',
        description: 'Deactivate workflow before deletion',
        workflowId
      });

      // Delete from n8n
      await n8nService.deleteWorkflow(workflowId);

      transaction.addOperation({
        type: 'delete_n8n_workflow',
        description: 'Delete workflow from n8n',
        workflowId
      });

      // Update database record (soft delete)
      await transaction.client.query(
        `
        UPDATE workflow_deployments 
        SET workflow_status = $1, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $2 AND n8n_workflow_id = $3
      `,
        ['deleted', userId, workflowId]
      );

      transaction.addOperation({
        type: 'update_database_status',
        description: 'Mark workflow as deleted in database',
        workflowId
      });

      // Commit transaction
      await transaction.commit();

      res.json({
        success: true,
        deletion: {
          workflowId,
          workflowName,
          status: 'deleted',
          deletedAt: new Date()
        },
        message: 'Workflow deleted successfully',
        transactionId
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Workflow deletion error:', error);
    res.status(500).json({
      error: 'Workflow deletion failed',
      message: error.message,
      transactionId,
      canRetry: true
    });
  }
});

// POST /api/workflows/reconfigure
// Reconfigure workflow
router.post('/reconfigure', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { emailProvider, businessTypeId, customSettings } = req.body;
    
    // Validate inputs
    if (!emailProvider || !businessTypeId) {
      return res.status(400).json({
        success: false,
        message: 'Email provider and business type are required'
      });
    }
    
    // Verify business type exists
    const businessType = await databaseOperations.getBusinessTypeById(businessTypeId);
    
    if (!businessType.data) {
      return res.status(400).json({
        success: false,
        message: 'Invalid business type ID'
      });
    }
    
    // Update user configuration
    await databaseOperations.updateUserConfiguration(userId, {
      emailProvider,
      businessTypeId,
      customSettings: customSettings || {}
    });
    
    // Check if user has existing workflow
    const workflow = await databaseOperations.getUserWorkflow(userId);
    
    let workflowResult;
    
    if (workflow.data) {
      // Update existing workflow
      workflowResult = await scheduler.updateWorkflow({
        workflowId: workflow.data.workflow_id,
        userId,
        emailProvider,
        businessType: businessType.data.name,
        template: businessType.data.workflow_template,
        customSettings: customSettings || {}
      });
    } else {
      // Deploy new workflow
      workflowResult = await scheduler.deployWorkflow({
        userId,
        emailProvider,
        businessType: businessType.data.name,
        template: businessType.data.workflow_template,
        customSettings: customSettings || {}
      });
      
      // Store workflow ID
      await databaseOperations.updateUserWorkflow(userId, workflowResult.workflowId);
    }
    
    if (!workflowResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to reconfigure workflow',
        error: workflowResult.error
      });
    }
    
    // Log activity
// WARNING: Parameter mismatch - logUserActivity expects 4 parameters but called with 7
    await logUserActivity(userId, 'WORKFLOW_RECONFIGURED', {
      workflowId: workflowResult.workflowId,
      emailProvider,
      businessTypeId,
      businessTypeName: businessType.data.name
    }, req);
    
    return res.json({
      success: true,
      message: 'Workflow reconfigured successfully',
      data: {
        workflowId: workflowResult.workflowId
      }
    });
  } catch (error) {
    logger.error('Failed to reconfigure workflow', { error, userId: req.user.id });
    return res.status(500).json({
      success: false,
      message: 'Failed to reconfigure workflow',
      error: error.message
    });
  }
});

// Helper function to log user activity
async function logUserActivity(userId, activityType, metadata, req) {
// WARNING: Parameter mismatch - logUserActivity expects 4 parameters but called with 3
  try {
    await databaseOperations.logUserActivity(userId, activityType, metadata);
  } catch (error) {
    logger.warn('Failed to log user activity', { error, userId, activityType });
  }
}

module.exports = router;
