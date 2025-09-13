const express = require('express');
const { body, validationResult } = require('express-validator');

const { databaseOperations } = require('../database/database-operations');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// GET /api/business-types
// Get all active business types for selection UI
router.get('/', async (req, res) => {
  try {
    console.log('🔍 Fetching business types via REST API...');

    const result = await databaseOperations.getBusinessTypes();

    if (result.error) {
      console.error('Business types fetch error:', result.error);
      return res.status(500).json({
        success: false,
        error: 'Database error',
        message: 'Failed to fetch business types',
        details: result.error.message
      });
    }

    const businessTypes = result.data || [];
    console.log(`✅ Retrieved ${businessTypes.length} business types`);

    res.json({
      success: true,
      data: businessTypes
    });
  } catch (error) {
    console.error('Business types fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to fetch business types',
      details: error.message
    });
  }
});

// GET /api/business-types/:slug
// Get specific business type by slug
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    console.log(`🔍 Fetching business type by slug: ${slug}`);

    const result = await databaseOperations.getBusinessTypeBySlug(slug);

    if (result.error) {
      if (result.error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          error: 'Business type not found',
          message: 'The requested business type does not exist or is not available'
        });
      }

      console.error('Business type fetch error:', result.error);
      return res.status(500).json({
        success: false,
        error: 'Database error',
        message: 'Failed to fetch business type',
        details: result.error.message
      });
    }

    console.log(`✅ Retrieved business type: ${result.data.name}`);
    res.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    console.error('Business type fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to fetch business type',
      details: error.message
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

      console.log(`🔍 Selecting business type ${businessTypeId} for user ${userId}`);

      // Verify business type exists and is active using REST API
      const businessTypeResult = await databaseOperations.getBusinessTypeById(businessTypeId);

      if (businessTypeResult.error) {
        console.error('Business type verification error:', businessTypeResult.error);
        return res.status(400).json({
          success: false,
          error: 'Invalid business type',
          message: 'The selected business type is not available'
        });
      }

      const businessType = businessTypeResult.data;

      // Update user's business type using REST API
      const updateResult = await databaseOperations.updateUserBusinessType(userId, businessTypeId);

      if (updateResult.error) {
        console.error('Error updating user business type:', updateResult.error);
        return res.status(500).json({
          success: false,
          error: 'Failed to update business type',
          message: 'Unable to save your business type selection',
          details: updateResult.error.message
        });
      }

      // Update onboarding progress using REST API
      const stepData = {
        'business-type': {
          businessTypeId: businessTypeId,
          businessTypeName: businessType.name,
          businessTypeSlug: businessType.slug,
          selectedAt: new Date().toISOString()
        }
      };

      try {
        await databaseOperations.updateOnboardingProgress(userId, stepData);
        console.log('✅ Onboarding progress updated');
      } catch (progressError) {
        console.error('Error updating onboarding progress:', progressError);
        // Don't fail the request for progress tracking errors
      }

      // Log analytics event (simplified for now)
      try {
        console.log(`📊 Analytics: User ${userId} selected business type ${businessType.name}`);
        // TODO: Implement proper analytics tracking with REST API
      } catch (analyticsError) {
        console.error('Analytics tracking error:', analyticsError);
        // Don't fail the request for analytics errors
      }

      console.log(`✅ Business type ${businessType.name} selected successfully for user ${userId}`);

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
        success: false,
        error: 'Internal server error',
        message: 'Failed to select business type',
        details: error.message
      });
    }
  }
);

// GET /api/business-types/user/current
// Get current user's selected business type
router.get('/user/current', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const queryText = `
      SELECT u.business_type_id,
             bt.id, bt.name, bt.description, bt.slug, bt.default_categories
      FROM users u
      LEFT JOIN business_types bt ON u.business_type_id = bt.id
      WHERE u.id = $1
    `;

    const result = await query(queryText, [userId]);

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
    const queryText = `
      SELECT id, name, slug, default_categories
      FROM business_types
      WHERE id = $1 AND is_active = true
    `;

    const result = await query(queryText, [parseInt(businessTypeId, 10)]);

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
