const express = require('express');
const { query } = require('../database/unified-connection');
const { authenticateToken } = require('../middleware/auth');
const gmailService = require('../services/gmailService');

const router = express.Router();

// GET /api/onboarding/status
// Get user's onboarding progress
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get onboarding progress
    const progressQuery = `
      SELECT current_step, completed_steps, step_data, google_connected, completed
      FROM onboarding_progress
      WHERE user_id = $1
    `;
    const progressResult = await query(progressQuery, [userId]);
    const progress = progressResult.rows[0] || null;

    // Get business config if exists
    const configQuery = `
      SELECT config, version, created_at, updated_at
      FROM business_configs
      WHERE user_id = $1 AND is_active = true
    `;
    const configResult = await query(configQuery, [userId]);
    const businessConfig = configResult.rows[0] || null;

    // Check if Google is connected
    const credQuery = 'SELECT id FROM credentials WHERE user_id = $1 AND service_name = $2';
    const credResult = await query(credQuery, [userId, 'google']);
    const googleConnected = credResult.rows.length > 0;

    // Check if user has selected business type
    const userQuery = 'SELECT business_type_id FROM users WHERE id = $1';
    const userResult = await query(userQuery, [userId]);

    const user = userResult.rows[0];
    const hasBusinessType = user && user.business_type_id;

    // Determine next step based on progress
    let nextStep = 'welcome';
    if (!googleConnected) {
      nextStep = 'google-connection';
    } else if (!hasBusinessType) {
      nextStep = 'business-type';
    } else if (!businessConfig) {
      nextStep = 'business-categories';
    } else if (!progress || !progress.completed) {
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
      onboardingCompleted: progress ? progress.completed : false
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
    // Get current progress
    const progressQuery = `
      SELECT current_step, completed_steps, step_data, google_connected, completed
      FROM onboarding_progress
      WHERE user_id = $1
    `;
    const progressResult = await query(progressQuery, [userId]);
    let progress = progressResult.rows[0] || null;

    // Initialize if doesn't exist
    if (!progress) {
      progress = {
        current_step: 'welcome',
        completed_steps: [],
        step_data: {},
        google_connected: false,
        completed: false
      };
    }

    // Update step data
    const updatedStepData = {
      ...progress.step_data,
      [stepId]: data
    };

    // Update completed steps
    const updatedCompletedSteps = [...progress.completed_steps];
    if (completed && !updatedCompletedSteps.includes(stepId)) {
      updatedCompletedSteps.push(stepId);
    }

    // Determine next step
    let nextStep = stepId;
    const stepOrder = [
      'welcome',
      'business-type',
      'business-categories',
      'label-mapping',
      'team-setup',
      'review',
      'workflow-deployment',
      'completion'
    ];
    const currentIndex = stepOrder.indexOf(stepId);
    if (currentIndex >= 0 && currentIndex < stepOrder.length - 1) {
      nextStep = stepOrder[currentIndex + 1];
    }

    // Check if Google is connected
    const credQuery = 'SELECT id FROM credentials WHERE user_id = $1 AND service_name = $2';
    const credResult = await query(credQuery, [userId, 'google']);
    const googleConnected = credResult.rows.length > 0;

    // Update progress
    const upsertQuery = `
      INSERT INTO onboarding_progress (user_id, current_step, completed_steps, step_data, google_connected, completed)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (user_id)
      DO UPDATE SET
        current_step = EXCLUDED.current_step,
        completed_steps = EXCLUDED.completed_steps,
        step_data = EXCLUDED.step_data,
        google_connected = EXCLUDED.google_connected,
        completed = EXCLUDED.completed,
        updated_at = NOW()
    `;
    await query(upsertQuery, [
      userId,
      nextStep,
      JSON.stringify(updatedCompletedSteps),
      JSON.stringify(updatedStepData),
      googleConnected,
      progress.completed || false
    ]);

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
    // Validate required fields
    if (!config.business_name || !config.contact_email || !config.email_categories) {
      return res.status(400).json({
        success: false,
        message: 'Missing required configuration fields'
      });
    }

    // Store business configuration
    const configQuery = `
      INSERT INTO business_configs (user_id, config, version, is_active)
      VALUES ($1, $2, 1, true)
      ON CONFLICT (user_id)
      DO UPDATE SET
        config = EXCLUDED.config,
        version = business_configs.version + 1,
        updated_at = NOW()
      RETURNING id
    `;
    const result = await query(configQuery, [userId, JSON.stringify(config)]);

    // Update onboarding progress
    const progressQuery = `
      INSERT INTO onboarding_progress (user_id, current_step, completed_steps, step_data, google_connected, completed)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (user_id)
      DO UPDATE SET
        current_step = EXCLUDED.current_step,
        completed_steps = EXCLUDED.completed_steps,
        step_data = EXCLUDED.step_data,
        updated_at = NOW()
    `;
    await query(progressQuery, [
      userId,
      'workflow-deployment',
      JSON.stringify(['welcome', 'business-categories', 'label-mapping', 'team-setup', 'review']),
      JSON.stringify({ 'business-config': config }),
      true, // Google should be connected by this point
      false
    ]);

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
    // Get Google credentials
    const credQuery = `
      SELECT access_token, refresh_token, expiry_date
      FROM credentials
      WHERE user_id = $1 AND service_name = $2
    `;
    const credResult = await query(credQuery, [userId, 'google']);
    const credentials = credResult.rows[0] || null;

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
      labels: labels.filter(
        label =>
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
    // Update onboarding progress as completed
    const progressQuery = `
      INSERT INTO onboarding_progress (user_id, current_step, completed_steps, step_data, google_connected, completed)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (user_id)
      DO UPDATE SET
        current_step = EXCLUDED.current_step,
        completed_steps = EXCLUDED.completed_steps,
        step_data = EXCLUDED.step_data,
        google_connected = EXCLUDED.google_connected,
        completed = EXCLUDED.completed,
        updated_at = NOW()
    `;
    await query(progressQuery, [
      userId,
      'completed',
      JSON.stringify([
        'welcome',
        'business-type',
        'business-categories',
        'label-mapping',
        'team-setup',
        'review',
        'workflow-deployment',
        'completion'
      ]),
      JSON.stringify({ workflowId, webhookUrl }),
      true,
      true
    ]);

    // Track completion event
    const eventQuery = `
      INSERT INTO analytics_events (user_id, event_type, event_data, created_at)
      VALUES ($1, $2, $3, NOW())
    `;
    await query(eventQuery, [
      userId,
      'onboarding_completed',
      JSON.stringify({
        workflowId,
        webhookUrl,
        completedAt: new Date().toISOString()
      })
    ]);

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
    // Get business config
    const configQuery = `
      SELECT config, version, created_at, updated_at
      FROM business_configs
      WHERE user_id = $1 AND is_active = true
    `;
    const configResult = await query(configQuery, [userId]);
    const businessConfig = configResult.rows[0] || null;

    if (!businessConfig) {
      return res.status(404).json({
        success: false,
        message: 'Business configuration not found'
      });
    }

    // Get credentials for external integrations
    const credQuery = `
      SELECT access_token, refresh_token, expiry_date
      FROM credentials
      WHERE user_id = $1 AND service_name = $2
    `;
    const credResult = await query(credQuery, [userId, 'google']);
    const googleCredentials = credResult.rows[0] || null;

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
