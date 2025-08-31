const express = require('express');
const { getSupabaseClient } = require('../database/connection');
const { authenticateToken } = require('../middleware/auth');
const gmailService = require('../services/gmailService');

const router = express.Router();

// GET /api/onboarding/status
// Get user's onboarding progress using new Supabase schema
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const supabase = getSupabaseClient();

    // Get onboarding progress
    const progress = await supabase.getOnboardingProgress(userId);
    
    // Get business config if exists
    const businessConfig = await supabase.getBusinessConfig(userId);
    
    // Check if Google is connected
    const googleCredentials = await supabase.getCredentials(userId, 'google');
    const googleConnected = !!googleCredentials;

    // Determine next step based on progress
    let nextStep = 'welcome';
    if (!googleConnected) {
      nextStep = 'google-connection';
    } else if (!businessConfig) {
      nextStep = 'business-categories';
    } else if (!progress || !progress.workflow_deployed) {
      nextStep = 'workflow-deployment';
    } else {
      nextStep = 'completed';
    }

    res.json({
      success: true,
      user: {
        id: userId,
        email: req.user.email
      },
      googleConnected,
      completedSteps: progress ? progress.completed_steps : [],
      stepData: progress ? progress.step_data : {},
      nextStep,
      businessConfig: businessConfig ? businessConfig.config : null,
      onboardingCompleted: progress ? progress.onboarding_completed : false
    });

  } catch (error) {
    console.error('Error fetching onboarding status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch onboarding status'
    });
  }
});

// POST /api/onboarding/step
// Update onboarding step progress
router.post('/step', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { stepId, data, completed = true } = req.body;
    const supabase = getSupabaseClient();

    // Get current progress
    let progress = await supabase.getOnboardingProgress(userId);
    
    // Initialize if doesn't exist
    if (!progress) {
      progress = {
        current_step: 'welcome',
        completed_steps: [],
        step_data: {},
        google_connected: false,
        workflow_deployed: false
      };
    }

    // Update step data
    const updatedStepData = {
      ...progress.step_data,
      [stepId]: data
    };

    // Update completed steps
    let updatedCompletedSteps = [...progress.completed_steps];
    if (completed && !updatedCompletedSteps.includes(stepId)) {
      updatedCompletedSteps.push(stepId);
    }

    // Determine next step
    let nextStep = stepId;
    const stepOrder = ['welcome', 'business-categories', 'label-mapping', 'team-setup', 'review', 'workflow-deployment', 'completion'];
    const currentIndex = stepOrder.indexOf(stepId);
    if (currentIndex >= 0 && currentIndex < stepOrder.length - 1) {
      nextStep = stepOrder[currentIndex + 1];
    }

    // Check if Google is connected
    const googleCredentials = await supabase.getCredentials(userId, 'google');
    const googleConnected = !!googleCredentials;

    // Update progress
    await supabase.updateOnboardingProgress(
      userId,
      nextStep,
      updatedCompletedSteps,
      updatedStepData,
      googleConnected,
      progress.workflow_deployed
    );

    res.json({
      success: true,
      message: 'Step progress updated',
      nextStep,
      completedSteps: updatedCompletedSteps
    });

  } catch (error) {
    console.error('Error updating onboarding step:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update step progress'
    });
  }
});

// POST /api/onboarding/business-config
// Save complete business configuration
router.post('/business-config', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { config } = req.body;
    const supabase = getSupabaseClient();

    // Validate required fields
    if (!config.business_name || !config.contact_email || !config.email_categories) {
      return res.status(400).json({
        success: false,
        message: 'Missing required configuration fields'
      });
    }

    // Store business configuration
    const result = await supabase.storeBusinessConfig(userId, config);

    // Update onboarding progress
    await supabase.updateOnboardingProgress(
      userId,
      'workflow-deployment',
      ['welcome', 'business-categories', 'label-mapping', 'team-setup', 'review'],
      { 'business-config': config },
      true, // Google should be connected by this point
      false
    );

    res.json({
      success: true,
      message: 'Business configuration saved',
      configId: result.id,
      version: result.version
    });

  } catch (error) {
    console.error('Error saving business config:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save business configuration'
    });
  }
});

// GET /api/onboarding/gmail-labels
// Get Gmail labels for the authenticated user
router.get('/gmail-labels', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const supabase = getSupabaseClient();

    // Get Google credentials
    const credentials = await supabase.getCredentials(userId, 'google');
    
    if (!credentials) {
      return res.status(400).json({
        success: false,
        message: 'Google account not connected'
      });
    }

    // Fetch Gmail labels using the service
    const labels = await gmailService.getLabels(credentials.accessToken);

    res.json({
      success: true,
      labels: labels.filter(label => 
        label.type === 'user' && // Only user-created labels
        label.name !== 'CATEGORY_PERSONAL' &&
        label.name !== 'CATEGORY_SOCIAL' &&
        label.name !== 'CATEGORY_PROMOTIONS' &&
        label.name !== 'CATEGORY_UPDATES' &&
        label.name !== 'CATEGORY_FORUMS'
      )
    });

  } catch (error) {
    console.error('Error fetching Gmail labels:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch Gmail labels'
    });
  }
});

// POST /api/onboarding/complete
// Mark onboarding as completed
router.post('/complete', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { workflowId, webhookUrl } = req.body;
    const supabase = getSupabaseClient();

    // Update onboarding progress as completed
    await supabase.updateOnboardingProgress(
      userId,
      'completed',
      ['welcome', 'business-categories', 'label-mapping', 'team-setup', 'review', 'workflow-deployment', 'completion'],
      { workflowId, webhookUrl },
      true,
      true
    );

    // Track completion event
    await supabase.trackEvent(userId, 'onboarding_completed', {
      workflowId,
      webhookUrl,
      completedAt: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Onboarding completed successfully'
    });

  } catch (error) {
    console.error('Error completing onboarding:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete onboarding'
    });
  }
});

// GET /api/onboarding/config
// Get user's business configuration for n8n workflow
router.get('/config', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const supabase = getSupabaseClient();

    // Get business config
    const businessConfig = await supabase.getBusinessConfig(userId);
    
    if (!businessConfig) {
      return res.status(404).json({
        success: false,
        message: 'Business configuration not found'
      });
    }

    // Get credentials for external integrations
    const googleCredentials = await supabase.getCredentials(userId, 'google');

    res.json({
      success: true,
      config: businessConfig.config,
      version: businessConfig.version,
      hasGoogleCredentials: !!googleCredentials,
      updatedAt: businessConfig.updatedAt
    });

  } catch (error) {
    console.error('Error fetching business config:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch business configuration'
    });
  }
});

module.exports = router;
