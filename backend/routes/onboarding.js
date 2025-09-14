const express = require('express');
const { body, validationResult } = require('express-validator');

const { query, transaction } = require('../database/unified-connection');
const { authenticateToken } = require('../middleware/auth');
const { databaseOperations } = require('../database/database-operations');
const gmailService = require('../services/gmailService');
const onboardingSessionService = require('../services/onboardingSessionService');
const transactionService = require('../services/transactionService');

const router = express.Router();

// GET /api/onboarding/status
// Get user's onboarding progress including email provider and business type
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user's basic info using database operations
    const userResult = await databaseOperations.getUserById(userId);
    if (userResult.error || !userResult.data) {
      return res.status(404).json({
        error: 'User not found',
        message: userResult.error
      });
    }

    // Get user configuration (email provider, business type, custom settings)
    const userConfig = await databaseOperations.getUserConfiguration(userId);

    // Get all business types for selection
    const businessTypes = await databaseOperations.getBusinessTypes();

    // Mock onboarding status data for now (since we don't have user_onboarding_status table in migration)
    const completedSteps = [];
    const user = userResult.data;

    // Handle migration-required case
    if (userConfig.data?.migrationRequired) {
      console.warn('⚠️  Database migration required for full email provider functionality');
      return res.json({
        user: {
          emailVerified: user.email_verified,
          onboardingCompleted: user.onboarding_completed,
          firstName: user.first_name,
          companyName: user.company_name
        },
        googleConnected: false,
        emailProvider: null, // Migration required
        businessTypeId: user.business_type_id || null, // Fallback to users table
        businessTypes: businessTypes.data || [],
        onboardingComplete: false,
        customSettings: {},
        completedSteps,
        stepData: {},
        nextStep: 'email-provider', // Start with email provider selection
        migrationRequired: true,
        warning: userConfig.warning || 'Database migration required for email provider functionality'
      });
    }

    res.json({
      user: {
        emailVerified: user.email_verified,
        onboardingCompleted: user.onboarding_completed,
        firstName: user.first_name,
        companyName: user.company_name
      },
      googleConnected: false, // Mock for now - would need to check credentials table
      emailProvider: userConfig.data?.email_provider || user.email_provider || null,
      businessTypeId: userConfig.data?.business_type_id || user.business_type_id || null,
      businessTypes: businessTypes.data || [],
      onboardingComplete: !!(
        (userConfig.data?.email_provider || user.email_provider) &&
        (userConfig.data?.business_type_id || user.business_type_id)
      ),
      customSettings: userConfig.data?.custom_settings || {},
      completedSteps,
      stepData: {}, // Mock for now - would need user_onboarding_status table
      nextStep: getNextStep(completedSteps, false, {
        email_provider: userConfig.data?.email_provider || user.email_provider,
        business_type_id: userConfig.data?.business_type_id || user.business_type_id
      })
    });
  } catch (error) {
    console.error('Onboarding status error:', error);
    res.status(500).json({
      error: 'Failed to get onboarding status',
      message: error.message
    });
  }
});

// POST /api/onboarding/email-provider
// Select email provider for authenticated user
router.post('/email-provider', authenticateToken, [
  body('provider')
    .isIn(['gmail', 'outlook'])
    .withMessage('Provider must be either gmail or outlook')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { provider } = req.body;
    const userId = req.user.id;

    // Update user's email provider
    const updateResult = await databaseOperations.updateUserEmailProvider(userId, provider);

    if (updateResult.error) {
      console.error('Error updating user email provider:', updateResult.error);
      return res.status(500).json({
        success: false,
        error: 'Failed to update email provider',
        message: 'Unable to save your email provider selection',
        details: updateResult.error.message
      });
    }

    // Handle migration-required case
    if (updateResult.data?.migrationRequired) {
      console.warn('⚠️  Database migration required - email provider selection simulated');
      return res.json({
        success: true,
        message: 'Email provider selected successfully (migration required)',
        data: {
          provider,
          migrationRequired: true,
          warning: updateResult.warning || 'Database migration required for full functionality'
        }
      });
    }

    res.json({
      success: true,
      message: 'Email provider selected successfully',
      data: { provider }
    });
  } catch (error) {
    console.error('Failed to select email provider:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to select email provider',
      message: error.message
    });
  }
});

// POST /api/onboarding/custom-settings
// Save custom onboarding settings
router.post('/custom-settings', authenticateToken, [
  body('settings').isObject().withMessage('Settings must be an object')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { settings } = req.body;
    const userId = req.user.id;

    // Update user's custom settings
    const updateResult = await databaseOperations.updateUserCustomSettings(userId, settings);

    if (updateResult.error) {
      console.error('Error updating custom settings:', updateResult.error);
      return res.status(500).json({
        success: false,
        error: 'Failed to update custom settings',
        message: 'Unable to save your custom settings',
        details: updateResult.error.message
      });
    }

    // Handle migration-required case
    if (updateResult.data?.migrationRequired) {
      console.warn('⚠️  Database migration required - custom settings update simulated');
      return res.json({
        success: true,
        message: 'Custom settings updated successfully (migration required)',
        data: {
          settings,
          migrationRequired: true,
          warning: updateResult.warning || 'Database migration required for full functionality'
        }
      });
    }

    res.json({
      success: true,
      message: 'Custom settings updated successfully',
      data: { settings }
    });
  } catch (error) {
    console.error('Failed to update custom settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update custom settings',
      message: error.message
    });
  }
});

// POST /api/onboarding/step/business-categories
// Save business email categories with transaction support
router.post('/step/business-categories', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const transactionId = `business-categories-${userId}-${Date.now()}`;

  try {
    const { categories } = req.body;

    if (!categories || !Array.isArray(categories) || categories.length === 0) {
      return res.status(400).json({
        error: 'Invalid categories',
        message: 'Categories must be a non-empty array'
      });
    }

    // Start transaction
    const transaction = await transactionService.startTransaction(transactionId);

    try {
      // Create or resume session
      await onboardingSessionService.createOrResumeSession(userId, 'business-categories');

      // Delete existing categories for this user
      transaction.addOperation({
        type: 'delete_categories',
        description: 'Remove existing business categories',
        query: 'DELETE FROM business_categories WHERE user_id = $1',
        params: [userId]
      });
      await transaction.client.query('DELETE FROM business_categories WHERE user_id = $1', [userId]);

      // Insert new categories
      for (const category of categories) {
        transaction.addOperation({
          type: 'insert_category',
          description: `Insert category: ${category.name}`,
          query: 'INSERT INTO business_categories (user_id, category_name, description) VALUES ($1, $2, $3)',
          params: [userId, category.name, category.description || null]
        });

        await transaction.client.query(
          'INSERT INTO business_categories (user_id, category_name, description) VALUES ($1, $2, $3)',
          [userId, category.name, category.description || null]
        );
      }

      // Update onboarding status
      transaction.addOperation({
        type: 'update_onboarding_status',
        description: 'Update onboarding progress',
        query: `INSERT INTO user_onboarding_status (user_id, step_completed, step_data)
                VALUES ($1, $2, $3)
                ON CONFLICT (user_id, step_completed)
                DO UPDATE SET step_data = EXCLUDED.step_data, completed_at = CURRENT_TIMESTAMP`,
        params: [userId, 'business-categories', JSON.stringify({ categories })]
      });

      await transaction.client.query(
        `
        INSERT INTO user_onboarding_status (user_id, step_completed, step_data)
        VALUES ($1, $2, $3)
        ON CONFLICT (user_id, step_completed)
        DO UPDATE SET step_data = EXCLUDED.step_data, completed_at = CURRENT_TIMESTAMP
      `,
        [userId, 'business-categories', JSON.stringify({ categories })]
      );

      // Commit transaction
      await transaction.commit();

      // Save checkpoint
      await onboardingSessionService.saveCheckpoint(userId, 'business-categories', { categories }, transactionId);

      res.json({
        success: true,
        message: 'Business categories saved successfully',
        categories: categories.length,
        transactionId
      });
    } catch (error) {
      await transaction.rollback();

      // Handle step failure
      await onboardingSessionService.handleStepFailure(userId, 'business-categories', error, transactionId);

      throw error;
    }
  } catch (error) {
    console.error('Business categories save error:', error);
    res.status(500).json({
      error: 'Failed to save business categories',
      message: error.message,
      transactionId,
      canRetry: true,
      suggestedAction: 'retry_step'
    });
  }
});

// GET /api/onboarding/gmail-labels
// Fetch user's Gmail labels
router.get('/gmail-labels', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const labels = await gmailService.fetchGmailLabels(userId);

    res.json({
      labels: labels.filter(
        label =>
          label.type === 'user' ||
          ['INBOX', 'SENT', 'DRAFT', 'SPAM', 'TRASH', 'IMPORTANT', 'STARRED'].includes(label.id)
      )
    });
  } catch (error) {
    console.error('Gmail labels fetch error:', error);
    res.status(500).json({
      error: 'Failed to fetch Gmail labels',
      message: error.message
    });
  }
});

// POST /api/onboarding/step/label-mapping
// Save category to Gmail label mappings
router.post('/step/label-mapping', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { mappings } = req.body;

    if (!mappings || !Array.isArray(mappings)) {
      return res.status(400).json({
        error: 'Invalid mappings',
        message: 'Mappings must be an array'
      });
    }

    // Use transaction wrapper from unified connection
    const result = await transaction(async client => {
      // Delete existing mappings for this user
      await client.query('DELETE FROM category_label_mappings WHERE user_id = $1', [userId]);

      // Insert new mappings
      for (const mapping of mappings) {
        // Get category ID
        const categoryResult = await client.query(
          'SELECT id FROM business_categories WHERE user_id = $1 AND category_name = $2',
          [userId, mapping.categoryName]
        );

        if (categoryResult.rows.length > 0) {
          await client.query(
            `
            INSERT INTO category_label_mappings
            (user_id, category_id, gmail_label_id, gmail_label_name)
            VALUES ($1, $2, $3, $4)
          `,
            [userId, categoryResult.rows[0].id, mapping.gmailLabelId, mapping.gmailLabelName]
          );
        }
      }

      // Update onboarding status
      await client.query(
        `
        INSERT INTO user_onboarding_status (user_id, step_completed, step_data)
        VALUES ($1, $2, $3)
        ON CONFLICT (user_id, step_completed)
        DO UPDATE SET step_data = EXCLUDED.step_data, completed_at = CURRENT_TIMESTAMP
      `,
        [userId, 'label-mapping', JSON.stringify({ mappings })]
      );

      return {
        message: 'Label mappings saved successfully',
        mappings: mappings.length
      };
    });

    res.json(result);
  } catch (error) {
    console.error('Label mapping save error:', error);
    res.status(500).json({
      error: 'Failed to save label mappings',
      message: error.message
    });
  }
});

// POST /api/onboarding/step/team-setup
// Save team notification setup
router.post('/step/team-setup', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { teamMembers } = req.body;

    if (!teamMembers || !Array.isArray(teamMembers)) {
      return res.status(400).json({
        error: 'Invalid team members',
        message: 'Team members must be an array'
      });
    }

    // Use transaction wrapper from unified connection
    const result = await transaction(async client => {
      // Delete existing team members for this user
      await client.query('DELETE FROM team_notifications WHERE user_id = $1', [userId]);

      // Insert new team members
      for (const member of teamMembers) {
        let categoryId = null;

        if (member.categoryName) {
          const categoryResult = await client.query(
            'SELECT id FROM business_categories WHERE user_id = $1 AND category_name = $2',
            [userId, member.categoryName]
          );

          if (categoryResult.rows.length > 0) {
            categoryId = categoryResult.rows[0].id;
          }
        }

        await client.query(
          `
          INSERT INTO team_notifications
          (user_id, team_member_name, team_member_email, category_id, notification_enabled)
          VALUES ($1, $2, $3, $4, $5)
        `,
          [userId, member.name, member.email, categoryId, member.notificationEnabled !== false]
        );
      }

      // Update onboarding status
      await client.query(
        `
        INSERT INTO user_onboarding_status (user_id, step_completed, step_data)
        VALUES ($1, $2, $3)
        ON CONFLICT (user_id, step_completed)
        DO UPDATE SET step_data = EXCLUDED.step_data, completed_at = CURRENT_TIMESTAMP
      `,
        [userId, 'team-setup', JSON.stringify({ teamMembers })]
      );

      return {
        message: 'Team setup saved successfully',
        teamMembers: teamMembers.length
      };
    });

    res.json(result);
  } catch (error) {
    console.error('Team setup save error:', error);
    res.status(500).json({
      error: 'Failed to save team setup',
      message: error.message
    });
  }
});

// Helper function to determine next step
function getNextStep(completedSteps, googleConnected, userConfig = null) {
  // Step 1: Email provider selection
  if (!userConfig?.email_provider) {
    return 'email-provider';
  }

  // Step 2: Business type selection
  if (!userConfig?.business_type_id) {
    return 'business-type';
  }

  // Step 3: Google connection
  if (!googleConnected) {
    return 'google-connection';
  }

  // Step 4: Business categories setup
  if (!completedSteps.includes('business-categories')) {
    return 'business-categories';
  }

  // Step 5: Gmail label mapping
  if (!completedSteps.includes('label-mapping')) {
    return 'label-mapping';
  }

  // Step 6: Team setup
  if (!completedSteps.includes('team-setup')) {
    return 'team-setup';
  }

  // Step 7: Workflow deployment
  if (!completedSteps.includes('workflow-deployment')) {
    return 'workflow-deployment';
  }

  return 'completed';
}

// POST /api/onboarding/complete
// Mark onboarding as completed
router.post('/complete', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { workflowId, webhookUrl } = req.body;

    // Update user's onboarding status as completed
    const updateQuery = `
      UPDATE users
      SET onboarding_completed = true, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, email, onboarding_completed
    `;
    const result = await query(updateQuery, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User account not found'
      });
    }

    // Record completion in onboarding status table
    const statusQuery = `
      INSERT INTO user_onboarding_status (user_id, step_completed, step_data, completed_at)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id, step_completed)
      DO UPDATE SET
        step_data = EXCLUDED.step_data,
        completed_at = EXCLUDED.completed_at
    `;

    const completionData = {
      workflowId: workflowId || null,
      webhookUrl: webhookUrl || null,
      completedAt: new Date().toISOString()
    };

    await query(statusQuery, [userId, 'onboarding-complete', JSON.stringify(completionData)]);

    res.json({
      success: true,
      message: 'Onboarding completed successfully',
      user: result.rows[0],
      completionData
    });

  } catch (error) {
    console.error('Onboarding completion error:', error);
    res.status(500).json({
      error: 'Failed to complete onboarding',
      message: error.message
    });
  }
});

module.exports = router;
