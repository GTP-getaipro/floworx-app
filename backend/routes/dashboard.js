const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { databaseOperations } = require('../database/database-operations');
const { scheduler } = require('../scheduler/n8nScheduler');
const { logger } = require('../utils/logger');
const { getUserById, getRecentActivities, getOAuthConnections } = require('../database/unified-connection');
const { asyncHandler, successResponse } = require('../middleware/standardErrorHandler');
const { ErrorResponse } = require('../utils/ErrorResponse');

const router = express.Router();

// GET /api/dashboard
// Get dashboard data
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
    
    // Get user workflow
    const workflow = await databaseOperations.getUserWorkflow(userId);
    
    if (!workflow.data) {
      return res.json({
        success: true,
        data: {
          hasWorkflow: false,
          statistics: null
        }
      });
    }
    
    // Get workflow statistics
    const statistics = await scheduler.getWorkflowStatistics(workflow.data.workflow_id);
    
    return res.json({
      success: true,
      data: {
        hasWorkflow: true,
        workflowId: workflow.data.workflow_id,
        statistics: statistics.success ? statistics.data : null
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
// Get user activity
router.get('/activity', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    
    // Get user activity
    const activity = await databaseOperations.getUserActivityHistory(userId, limit, offset);
    
    return res.json({
      success: true,
      data: activity.data || []
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
