const express = require('express');
const { query, transaction } = require('../database/unified-connection');
const { authenticateToken } = require('../middleware/auth');
const gmailService = require('../services/gmailService');
const transactionService = require('../services/transactionService');
const onboardingSessionService = require('../services/onboardingSessionService');

const router = express.Router();

// GET /api/onboarding/status
// Get user's onboarding progress
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user's onboarding status
    const statusQuery = `
      SELECT step_completed, step_data, completed_at 
      FROM user_onboarding_status 
      WHERE user_id = $1 
      ORDER BY completed_at ASC
    `;
    const statusResult = await query(statusQuery, [userId]);

    // Get user's basic info
    const userQuery = `
      SELECT email_verified, onboarding_completed, first_name, company_name
      FROM users
      WHERE id = $1
    `;
    const userResult = await query(userQuery, [userId]);

    // Check if Google is connected
    const credQuery = 'SELECT id FROM credentials WHERE user_id = $1 AND service_name = $2';
    const credResult = await query(credQuery, [userId, 'google']);

    const completedSteps = statusResult.rows.map(row => row.step_completed);
    const user = userResult.rows[0];

    res.json({
      user: {
        emailVerified: user.email_verified,
        onboardingCompleted: user.onboarding_completed,
        firstName: user.first_name,
        companyName: user.company_name
      },
      googleConnected: credResult.rows.length > 0,
      completedSteps,
      stepData: statusResult.rows.reduce((acc, row) => {
        acc[row.step_completed] = row.step_data;
        return acc;
      }, {}),
      nextStep: getNextStep(completedSteps, credResult.rows.length > 0)
    });
  } catch (error) {
    console.error('Onboarding status error:', error);
    res.status(500).json({
      error: 'Failed to get onboarding status',
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
function getNextStep(completedSteps, googleConnected) {
  if (!googleConnected) {
    return 'google-connection';
  }

  if (!completedSteps.includes('business-categories')) {
    return 'business-categories';
  }

  if (!completedSteps.includes('label-mapping')) {
    return 'label-mapping';
  }

  if (!completedSteps.includes('team-setup')) {
    return 'team-setup';
  }

  if (!completedSteps.includes('workflow-deployment')) {
    return 'workflow-deployment';
  }

  return 'completed';
}

module.exports = router;
