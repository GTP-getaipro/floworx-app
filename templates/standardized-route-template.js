/**
 * Standardized Route Template for FloWorx SaaS
 * Use this template for all new routes to ensure consistency
 */

const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { validateRequest } = require('../utils/validateRequest');
const { asyncWrapper } = require('../utils/asyncWrapper');
const {
  createSuccessResponse,
  createErrorResponse,
  createPaginatedResponse
} = require('../utils');
const {
  AuthenticationError,
  ValidationError,
  NotFoundError,
  ConflictError
} = require('../utils/errors');

// Import validation schemas
const {
  createItemSchema,
  updateItemSchema,
  queryItemSchema
} = require('../schemas/yourSchema');

// Import service layer
const yourService = require('../services/yourService');

const router = express.Router();

/**
 * GET /api/your-route
 * Get all items with pagination and filtering
 */
router.get('/', 
  authenticateToken,
  validateRequest(queryItemSchema, 'query'),
  asyncWrapper(async (req, res) => {
    const { page = 1, limit = 20, search, filter } = req.query;
    const userId = req.user.id;

    const result = await yourService.getItems({
      userId,
      page: parseInt(page),
      limit: parseInt(limit),
      search,
      filter
    });

    res.json(createPaginatedResponse(result.items, result.pagination));
  })
);

/**
 * GET /api/your-route/:id
 * Get specific item by ID
 */
router.get('/:id',
  authenticateToken,
  asyncWrapper(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    const item = await yourService.getItemById(id, userId);
    
    if (!item) {
      throw new NotFoundError('Item not found');
    }

    res.json(createSuccessResponse(item));
  })
);

/**
 * POST /api/your-route
 * Create new item
 */
router.post('/',
  authenticateToken,
  validateRequest(createItemSchema, 'body'),
  asyncWrapper(async (req, res) => {
    const userId = req.user.id;
    const itemData = req.body;

    // Check for duplicates if needed
    const existingItem = await yourService.findExistingItem(itemData, userId);
    if (existingItem) {
      throw new ConflictError('Item already exists');
    }

    const newItem = await yourService.createItem({
      ...itemData,
      userId,
      createdBy: userId
    });

    res.status(201).json(createSuccessResponse(newItem, {
      message: 'Item created successfully'
    }));
  })
);

/**
 * PUT /api/your-route/:id
 * Update existing item
 */
router.put('/:id',
  authenticateToken,
  validateRequest(updateItemSchema, 'body'),
  asyncWrapper(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const updateData = req.body;

    // Verify ownership
    const existingItem = await yourService.getItemById(id, userId);
    if (!existingItem) {
      throw new NotFoundError('Item not found');
    }

    const updatedItem = await yourService.updateItem(id, {
      ...updateData,
      updatedBy: userId,
      updatedAt: new Date()
    });

    res.json(createSuccessResponse(updatedItem, {
      message: 'Item updated successfully'
    }));
  })
);

/**
 * DELETE /api/your-route/:id
 * Delete item (soft delete)
 */
router.delete('/:id',
  authenticateToken,
  asyncWrapper(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    // Verify ownership
    const existingItem = await yourService.getItemById(id, userId);
    if (!existingItem) {
      throw new NotFoundError('Item not found');
    }

    await yourService.deleteItem(id, userId);

    res.json(createSuccessResponse(null, {
      message: 'Item deleted successfully'
    }));
  })
);

/**
 * POST /api/your-route/:id/action
 * Perform specific action on item
 */
router.post('/:id/action',
  authenticateToken,
  validateRequest(actionSchema, 'body'),
  asyncWrapper(async (req, res) => {
    const { id } = req.params;
    const { action, parameters } = req.body;
    const userId = req.user.id;

    // Verify ownership
    const item = await yourService.getItemById(id, userId);
    if (!item) {
      throw new NotFoundError('Item not found');
    }

    const result = await yourService.performAction(id, action, parameters, userId);

    res.json(createSuccessResponse(result, {
      message: `Action '${action}' completed successfully`
    }));
  })
);

/**
 * GET /api/your-route/:id/stats
 * Get statistics for specific item
 */
router.get('/:id/stats',
  authenticateToken,
  asyncWrapper(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    // Verify ownership
    const item = await yourService.getItemById(id, userId);
    if (!item) {
      throw new NotFoundError('Item not found');
    }

    const stats = await yourService.getItemStats(id, userId);

    res.json(createSuccessResponse(stats));
  })
);

/**
 * Error handling middleware (if needed for route-specific errors)
 */
router.use((error, req, res, next) => {
  // Route-specific error handling
  if (error.code === 'SPECIFIC_ERROR_CODE') {
    return res.status(400).json(createErrorResponse(
      new ValidationError('Specific error message')
    ));
  }
  
  // Pass to global error handler
  next(error);
});

module.exports = router;

/**
 * USAGE INSTRUCTIONS:
 * 
 * 1. Copy this template to create new routes
 * 2. Replace 'your-route', 'yourService', 'yourSchema' with actual names
 * 3. Implement the corresponding service layer
 * 4. Create validation schemas
 * 5. Add route to server.js with appropriate middleware
 * 6. Write tests for all endpoints
 * 
 * EXAMPLE:
 * const workflowRoutes = require('./routes/workflows');
 * app.use('/api/workflows', workflowRoutes);
 */
