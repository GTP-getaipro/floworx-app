const express = require('express');
const { body, validationResult } = require('express-validator');

const { query } = require('../database/unified-connection');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// GET /api/business-types
// Get all active business types for selection UI
router.get('/', async (req, res) => {
  try {
    const query = `
      SELECT id, name, slug, description, default_categories,
             created_at, updated_at
      FROM business_types
      WHERE is_active = true
      ORDER BY name ASC
    `;

    const result = await query(query);
    const businessTypes = result.rows;

    res.json({
      success: true,
      data: businessTypes || []
    });
  } catch (error) {
    console.error('Business types fetch error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch business types'
    });
  }
});

// GET /api/business-types/:slug
// Get specific business type by slug
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    const query = `
      SELECT id, name, description, slug, default_categories
      FROM business_types
      WHERE slug = $1 AND is_active = true
    `;

    const result = await query(query, [slug]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Business type not found',
        message: 'The requested business type does not exist or is not available'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Business type fetch error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch business type'
    });
  }
});

// POST /api/business-types/select
// Select business type for authenticated user
router.post(
  '/select',
  authenticateToken,
  [body('businessTypeId').isInt({ min: 1 }).withMessage('Valid business type ID is required')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const userId = req.user.id;
      const { businessTypeId } = req.body;

      // Verify business type exists and is active
      const businessTypeQuery = `
        SELECT id, name, slug, default_categories
        FROM business_types
        WHERE id = $1 AND is_active = true
      `;

      const businessTypeResult = await query(businessTypeQuery, [businessTypeId]);

      if (businessTypeResult.rows.length === 0) {
        return res.status(400).json({
          error: 'Invalid business type',
          message: 'The selected business type is not available'
        });
      }

      const businessType = businessTypeResult.rows[0];

      // Update user's business type
      const updateUserQuery = `
        UPDATE users
        SET business_type_id = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING id
      `;

      const updateResult = await query(updateUserQuery, [businessTypeId, userId]);

      if (updateResult.rows.length === 0) {
        console.error('Error updating user business type: User not found');
        return res.status(500).json({
          error: 'Failed to update business type',
          message: 'Unable to save your business type selection'
        });
      }

      // Update onboarding progress
      const progressQuery = `
        INSERT INTO onboarding_progress (user_id, step_data, updated_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (user_id)
        DO UPDATE SET
          step_data = jsonb_set(
            COALESCE(onboarding_progress.step_data, '{}'::jsonb),
            '{business-type}',
            $2->'business-type'
          ),
          updated_at = NOW()
      `;

      const stepData = {
        'business-type': {
          businessTypeId: businessTypeId,
          businessTypeName: businessType.name,
          businessTypeSlug: businessType.slug,
          selectedAt: new Date().toISOString()
        }
      };

      try {
        await query(progressQuery, [userId, JSON.stringify(stepData)]);
      } catch (progressError) {
        console.error('Error updating onboarding progress:', progressError);
        // Don't fail the request for progress tracking errors
      }

      // Log analytics event
      try {
        const analyticsQuery = `
          INSERT INTO user_analytics (user_id, event_type, event_data, created_at)
          VALUES ($1, $2, $3, NOW())
        `;

        const eventData = {
          business_type_id: businessTypeId,
          business_type_name: businessType.name,
          business_type_slug: businessType.slug
        };

        await query(analyticsQuery, [userId, 'business_type_selected', JSON.stringify(eventData)]);
      } catch (analyticsError) {
        console.error('Analytics tracking error:', analyticsError);
        // Don't fail the request for analytics errors
      }

      res.json({
        success: true,
        message: 'Business type selected successfully',
        data: {
          businessType: {
            id: businessType.id,
            name: businessType.name,
            slug: businessType.slug,
            defaultCategories: businessType.default_categories
          }
        }
      });
    } catch (error) {
      console.error('Business type selection error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to select business type'
      });
    }
  }
);

// GET /api/business-types/user/current
// Get current user's selected business type
router.get('/user/current', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const query = `
      SELECT u.business_type_id,
             bt.id, bt.name, bt.description, bt.slug, bt.default_categories
      FROM users u
      LEFT JOIN business_types bt ON u.business_type_id = bt.id
      WHERE u.id = $1
    `;

    const result = await query(query, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'User not found',
        message: 'Unable to find user account'
      });
    }

    const user = result.rows[0];

    if (!user.business_type_id || !user.id) {
      return res.json({
        success: true,
        data: null,
        message: 'No business type selected'
      });
    }

    res.json({
      success: true,
      data: {
        businessType: {
          id: user.id,
          name: user.name,
          description: user.description,
          slug: user.slug,
          default_categories: user.default_categories
        }
      }
    });
  } catch (error) {
    console.error('User business type fetch error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch user business type'
    });
  }
});

// GET /api/business-types/:businessTypeId/template
// Get workflow template for specific business type
router.get('/:businessTypeId/template', authenticateToken, async (req, res) => {
  try {
    const { businessTypeId } = req.params;

    // For now, return a basic template structure
    // This can be expanded when workflow templates are implemented
    const queryStr = `
      SELECT id, name, slug, default_categories
      FROM business_types
      WHERE id = $1 AND is_active = true
    `;

    const result = await query(queryStr, [parseInt(businessTypeId, 10)]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Business type not found',
        message: 'The requested business type does not exist'
      });
    }

    const businessType = result.rows[0];

    // Return a basic template structure based on business type
    const template = {
      businessTypeId: businessType.id,
      businessTypeName: businessType.name,
      categories: businessType.default_categories || [],
      workflowSteps: [
        {
          name: 'Email Processing',
          description: `Process ${businessType.name} related emails`,
          enabled: true
        },
        {
          name: 'Category Classification',
          description: 'Automatically categorize incoming emails',
          enabled: true
        },
        {
          name: 'Priority Assignment',
          description: 'Assign priority based on content and sender',
          enabled: true
        }
      ]
    };

    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    console.error('Workflow template fetch error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch workflow template'
    });
  }
});

module.exports = router;
