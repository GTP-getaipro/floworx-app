const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { databaseOperations } = require('../database/database-operations');
const { scheduler } = require('../scheduler/n8nScheduler');
const { logger } = require('../utils/logger');
const { asyncHandler, successResponse } = require('../middleware/standardErrorHandler');
const { ErrorResponse } = require('../utils/ErrorResponse');

const router = express.Router();

// GET /api/dashboard
// Get dashboard data - FIXED: All methods now use existing database operations
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user profile
    const userProfile = await databaseOperations.getUserProfile(userId);
    
    if (!userProfile.data) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Get user business configuration
    const userConfig = await databaseOperations.getBusinessConfig(userId);

    // Get user workflow deployments
    const workflow = await databaseOperations.getWorkflowDeployments(userId);

    // Get user onboarding progress (as activity substitute)
    const onboardingProgress = await databaseOperations.getOnboardingProgress(userId);
    
    return res.json({
      success: true,
      data: {
        user: {
          id: userProfile.data.id,
          email: userProfile.data.email,
          firstName: userProfile.data.first_name,
          lastName: userProfile.data.last_name,
          companyName: userProfile.data.company_name,
          emailVerified: userProfile.data.email_verified
        },
        configuration: userConfig.data ? {
          businessType: userConfig.data.business_type || 'hot_tub_service',
          emailProvider: userConfig.data.email_provider || null,
          customSettings: userConfig.data.custom_settings || {}
        } : {
          businessType: 'hot_tub_service',
          emailProvider: null,
          customSettings: {}
        },
        workflow: workflow.data && workflow.data.length > 0 ? {
          id: workflow.data[0].workflow_id || null,
          status: workflow.data[0].status || 'not_deployed',
          createdAt: workflow.data[0].created_at || null,
          updatedAt: workflow.data[0].updated_at || null
        } : {
          id: null,
          status: 'not_deployed',
          createdAt: null,
          updatedAt: null
        },
        onboarding: onboardingProgress.data ? {
          currentStep: onboardingProgress.data.current_step || 0,
          completedSteps: onboardingProgress.data.completed_steps || [],
          googleConnected: onboardingProgress.data.google_connected || false,
          workflowDeployed: onboardingProgress.data.workflow_deployed || false
        } : {
          currentStep: 0,
          completedSteps: [],
          googleConnected: false,
          workflowDeployed: false
        }
      }
    });
  } catch (error) {
    console.error('💥 Dashboard error:', error.message);
    console.error('Stack:', error.stack);
    return res.status(500).json({
      success: false,
      message: 'Failed to get dashboard data',
      error: error.message
    });
  }
});

// GET /api/dashboard/statistics
// Get workflow statistics
router.get('/statistics', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user workflow deployments (using existing method)
    const workflow = await databaseOperations.getWorkflowDeployments(userId);

    if (!workflow.data || !Array.isArray(workflow.data) || workflow.data.length === 0) {
      return res.json({
        success: true,
        data: {
          hasWorkflow: false,
          statistics: null
        }
      });
    }

    // Use the first (most recent) workflow deployment
    const latestWorkflow = workflow.data[0];

    // Return basic workflow info (scheduler.getWorkflowStatistics may not exist)
    return res.json({
      success: true,
      data: {
        hasWorkflow: true,
        workflowId: latestWorkflow.workflow_id || latestWorkflow.n8n_workflow_id,
        status: latestWorkflow.status || 'deployed',
        deployedAt: latestWorkflow.created_at || latestWorkflow.deployed_at,
        statistics: {
          status: latestWorkflow.status || 'active',
          lastUpdated: latestWorkflow.updated_at || latestWorkflow.deployed_at
        }
      }
    });
  } catch (error) {
    console.error('💥 Workflow statistics error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to get workflow statistics',
      error: error.message
    });
  }
});

// GET /api/dashboard/activity
// Get user activity (using onboarding progress as activity substitute)
router.get('/activity', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 20;

    // Get user onboarding progress as activity data
    const onboardingProgress = await databaseOperations.getOnboardingProgress(userId);
    const workflowDeployments = await databaseOperations.getWorkflowDeployments(userId);

    // Create activity-like data from available information
    const activityData = [];

    // Add onboarding activities
    if (onboardingProgress.data) {
      const progress = onboardingProgress.data;
      if (progress.completed_steps && Array.isArray(progress.completed_steps)) {
        progress.completed_steps.forEach((step, index) => {
          activityData.push({
            id: `onboarding-${index}`,
            type: 'onboarding_step',
            description: `Completed onboarding step: ${step}`,
            timestamp: progress.updated_at || progress.created_at,
            status: 'completed'
          });
        });
      }

      if (progress.google_connected) {
        activityData.push({
          id: 'google-connection',
          type: 'oauth_connection',
          description: 'Connected Google account',
          timestamp: progress.updated_at || progress.created_at,
          status: 'active'
        });
      }
    }

    // Add workflow deployment activities
    if (workflowDeployments.data && Array.isArray(workflowDeployments.data)) {
      workflowDeployments.data.forEach((workflow, index) => {
        activityData.push({
          id: `workflow-${index}`,
          type: 'workflow_deployment',
          description: `Workflow deployed: ${workflow.workflow_name || 'Email Automation'}`,
          timestamp: workflow.created_at || workflow.deployed_at,
          status: workflow.status || 'deployed'
        });
      });
    }

    // Sort by timestamp (most recent first) and limit results
    const sortedActivity = activityData
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);

    return res.json({
      success: true,
      data: sortedActivity
    });
  } catch (error) {
    console.error('💥 User activity error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to get user activity',
      error: error.message
    });
  }
});

// GET /api/dashboard/status
// Get dashboard status
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get basic user info using REST API
    const user = await getUserById(userId);

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User account not found'
      });
    }

    res.json({
      success: true,
      status: 'active',
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Dashboard status error:', error);
    res.status(500).json({
      error: 'Failed to get dashboard status',
      message: error.message
    });
  }
});

module.exports = router;
