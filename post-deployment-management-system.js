/**
 * Post-Deployment Management System
 * Allows clients to view metrics, modify settings, and redeploy their automation
 */

const express = require('express');
const { authenticateToken } = require('./backend/middleware/auth');
const { databaseOperations } = require('./backend/database/database-operations');
const n8nService = require('./backend/services/n8nService');
const recoverySystem = require('./n8n-deployment-recovery-system');

const router = express.Router();

// GET /api/client-dashboard/overview
// Main dashboard overview with key metrics
router.get('/overview', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user and business info
    const user = await databaseOperations.getUserById(userId);
    const businessConfig = await databaseOperations.getBusinessConfig(userId);
    const workflows = await n8nService.getUserWorkflows(userId);
    
    if (workflows.length === 0) {
      return res.json({
        success: true,
        status: 'no_automation',
        message: 'No automation deployed yet'
      });
    }

    const workflowId = workflows[0].n8n_workflow_id;
    
    // Get performance metrics (last 30 days)
    const metrics = await this.getPerformanceMetrics(workflowId, 30);
    
    // Get current automation status
    const automationStatus = await recoverySystem.getAutomationStatus(userId);
    
    // Get current configuration
    const currentConfig = await this.getCurrentConfiguration(userId);

    res.json({
      success: true,
      user: {
        name: `${user.data.first_name} ${user.data.last_name}`,
        businessName: businessConfig.data?.business_name,
        email: user.data.email
      },
      automation: {
        status: automationStatus.status,
        message: automationStatus.message,
        workflowId: workflowId,
        deployedAt: workflows[0].deployed_at
      },
      metrics: metrics,
      configuration: currentConfig,
      canRedeploy: automationStatus.status === 'active' || automationStatus.status === 'waiting'
    });
    
  } catch (error) {
    console.error('Dashboard overview error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load dashboard',
      message: error.message
    });
  }
});

// GET /api/client-dashboard/performance-metrics
// Detailed performance metrics
router.get('/performance-metrics', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const days = parseInt(req.query.days) || 30;
    
    const workflows = await n8nService.getUserWorkflows(userId);
    if (workflows.length === 0) {
      return res.json({ success: true, metrics: null, message: 'No automation deployed' });
    }

    const workflowId = workflows[0].n8n_workflow_id;
    const metrics = await this.getDetailedMetrics(workflowId, days);
    
    res.json({
      success: true,
      metrics: metrics,
      period: `${days} days`
    });
    
  } catch (error) {
    console.error('Performance metrics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load performance metrics'
    });
  }
});

// GET /api/client-dashboard/current-settings
// Get current automation settings
router.get('/current-settings', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const config = await this.getCurrentConfiguration(userId);
    
    res.json({
      success: true,
      settings: config
    });
    
  } catch (error) {
    console.error('Current settings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load current settings'
    });
  }
});

// PUT /api/client-dashboard/update-settings
// Update automation settings
router.put('/update-settings', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { managers, suppliers, businessRules, emailCategories } = req.body;
    
    // Validate the new settings
    const validation = await this.validateSettings({
      managers, suppliers, businessRules, emailCategories
    });
    
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid settings',
        details: validation.errors
      });
    }

    // Store updated configuration
    const updatedConfig = await databaseOperations.updateBusinessConfig(userId, {
      managers: managers,
      suppliers: suppliers,
      business_rules: businessRules,
      email_categories: emailCategories,
      updated_at: new Date().toISOString(),
      needs_redeployment: true
    });

    res.json({
      success: true,
      message: 'Settings updated successfully',
      configuration: updatedConfig.data,
      needsRedeployment: true
    });
    
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update settings',
      message: error.message
    });
  }
});

// POST /api/client-dashboard/redeploy-automation
// Redeploy automation with updated settings
router.post('/redeploy-automation', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { confirmRedeployment } = req.body;
    
    if (!confirmRedeployment) {
      return res.status(400).json({
        success: false,
        error: 'Redeployment confirmation required'
      });
    }

    // Get current configuration
    const config = await databaseOperations.getBusinessConfig(userId);
    
    if (!config.data?.needs_redeployment) {
      return res.json({
        success: true,
        message: 'No redeployment needed',
        skipped: true
      });
    }

    // Start redeployment process
    console.log(`🔄 Starting redeployment for user ${userId}`);
    
    // Deactivate current workflow
    const workflows = await n8nService.getUserWorkflows(userId);
    if (workflows.length > 0) {
      await n8nService.deactivateWorkflow(workflows[0].n8n_workflow_id);
    }

    // Deploy new workflow with updated configuration
    const deploymentResult = await recoverySystem.deployWorkflowWithRetry(
      userId, 
      config.data
    );

    // Mark as no longer needing redeployment
    await databaseOperations.updateBusinessConfig(userId, {
      needs_redeployment: false,
      last_redeployed_at: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Automation redeployed successfully',
      deployment: {
        workflowId: deploymentResult.workflowId,
        testResult: deploymentResult.testResult,
        redeployedAt: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Redeployment error:', error);
    res.status(500).json({
      success: false,
      error: 'Redeployment failed',
      message: error.message,
      canRetry: true
    });
  }
});

// GET /api/client-dashboard/redeployment-preview
// Preview what will change with redeployment
router.get('/redeployment-preview', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const currentConfig = await this.getCurrentConfiguration(userId);
    const pendingConfig = await databaseOperations.getBusinessConfig(userId);
    
    const changes = await this.compareConfigurations(
      currentConfig, 
      pendingConfig.data
    );

    res.json({
      success: true,
      preview: {
        hasChanges: changes.hasChanges,
        changes: changes.differences,
        impact: changes.impact,
        estimatedDowntime: '2-3 minutes'
      }
    });
    
  } catch (error) {
    console.error('Redeployment preview error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate preview'
    });
  }
});

// Helper Methods
class ClientDashboardHelpers {
  
  async getPerformanceMetrics(workflowId, days) {
    try {
      const executions = await n8nService.getRecentExecutions(workflowId, days * 24);
      
      const totalExecutions = executions.length;
      const successfulExecutions = executions.filter(e => e.status === 'success').length;
      const failedExecutions = executions.filter(e => e.status === 'error').length;
      
      // Calculate email processing stats
      let totalEmailsProcessed = 0;
      let totalLabelsApplied = 0;
      let totalDraftsCreated = 0;
      
      executions.forEach(execution => {
        totalEmailsProcessed += execution.data?.emailsProcessed || 0;
        totalLabelsApplied += execution.data?.labelsApplied || 0;
        totalDraftsCreated += execution.data?.draftsCreated || 0;
      });

      return {
        period: `${days} days`,
        executions: {
          total: totalExecutions,
          successful: successfulExecutions,
          failed: failedExecutions,
          successRate: totalExecutions > 0 ? Math.round((successfulExecutions / totalExecutions) * 100) : 0
        },
        emailProcessing: {
          totalEmailsProcessed,
          totalLabelsApplied,
          totalDraftsCreated,
          averageEmailsPerDay: Math.round(totalEmailsProcessed / days)
        },
        lastExecution: executions[0]?.startedAt || null
      };
      
    } catch (error) {
      console.error('Error getting performance metrics:', error);
      return null;
    }
  }

  async getCurrentConfiguration(userId) {
    try {
      const config = await databaseOperations.getBusinessConfig(userId);
      
      return {
        businessInfo: {
          name: config.data?.business_name,
          type: config.data?.business_type,
          address: config.data?.business_address,
          phone: config.data?.business_phone
        },
        managers: config.data?.managers || [],
        suppliers: config.data?.suppliers || [],
        emailCategories: config.data?.email_categories || ['Sales', 'Support', 'Urgent'],
        businessRules: config.data?.business_rules || {},
        lastUpdated: config.data?.updated_at
      };
      
    } catch (error) {
      console.error('Error getting current configuration:', error);
      return null;
    }
  }

  async validateSettings(settings) {
    const errors = [];
    
    // Validate managers
    if (settings.managers && !Array.isArray(settings.managers)) {
      errors.push('Managers must be an array');
    }
    
    // Validate suppliers
    if (settings.suppliers && !Array.isArray(settings.suppliers)) {
      errors.push('Suppliers must be an array');
    }
    
    // Validate email categories
    if (settings.emailCategories && !Array.isArray(settings.emailCategories)) {
      errors.push('Email categories must be an array');
    }
    
    return {
      valid: errors.length === 0,
      errors: errors
    };
  }

  async compareConfigurations(current, pending) {
    const differences = [];
    let hasChanges = false;
    
    // Compare managers
    if (JSON.stringify(current.managers) !== JSON.stringify(pending.managers)) {
      differences.push({
        field: 'managers',
        current: current.managers?.length || 0,
        pending: pending.managers?.length || 0,
        impact: 'Will create/remove automation branches for managers'
      });
      hasChanges = true;
    }
    
    // Compare suppliers
    if (JSON.stringify(current.suppliers) !== JSON.stringify(pending.suppliers)) {
      differences.push({
        field: 'suppliers',
        current: current.suppliers?.length || 0,
        pending: pending.suppliers?.length || 0,
        impact: 'Will update supplier notification rules'
      });
      hasChanges = true;
    }
    
    return {
      hasChanges,
      differences,
      impact: hasChanges ? 'Automation will be updated with new configuration' : 'No changes detected'
    };
  }
}

// Attach helper methods to router
const helpers = new ClientDashboardHelpers();
router.getPerformanceMetrics = helpers.getPerformanceMetrics.bind(helpers);
router.getCurrentConfiguration = helpers.getCurrentConfiguration.bind(helpers);
router.validateSettings = helpers.validateSettings.bind(helpers);
router.compareConfigurations = helpers.compareConfigurations.bind(helpers);

module.exports = router;
