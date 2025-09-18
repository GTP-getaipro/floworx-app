/**
 * Client Configuration API Routes
 * Provides CRUD operations for versioned client configurations
 * Used by n8n workflow templates and UI for dynamic configuration management
 */

const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const { csrfProtection } = require('../middleware/csrf');
const configService = require('../services/configService');

/**
 * GET /api/clients/:id/config
 * Retrieve client configuration (returns defaults if not found)
 */
router.get('/:id/config', requireAuth, async (req, res) => {
  try {
    const clientId = req.params.id;
    
    if (!clientId || typeof clientId !== 'string' || clientId.trim() === '') {
      return res.status(400).json({
        error: {
          code: 'INVALID_CLIENT_ID',
          message: 'Client ID is required and must be a non-empty string'
        }
      });
    }
    
    const config = await configService.loadConfig(clientId.trim());
    res.json(config);
  } catch (error) {
    console.error('Error in GET /api/clients/:id/config:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to load client configuration'
      }
    });
  }
});

/**
 * PUT /api/clients/:id/config
 * Update client configuration with validation and version bump
 */
router.put('/:id/config', requireAuth, csrfProtection, async (req, res) => {
  try {
    const clientId = req.params.id;
    
    if (!clientId || typeof clientId !== 'string' || clientId.trim() === '') {
      return res.status(400).json({
        error: {
          code: 'INVALID_CLIENT_ID',
          message: 'Client ID is required and must be a non-empty string'
        }
      });
    }
    
    const configPatch = req.body || {};
    
    const result = await configService.saveConfig(clientId.trim(), configPatch);
    
    res.json({
      ok: true,
      version: result.version
    });
  } catch (error) {
    console.error('Error in PUT /api/clients/:id/config:', error);
    
    if (error.code === 'VALIDATION_FAILED') {
      return res.status(400).json({
        error: {
          code: error.code,
          message: error.message,
          details: error.details
        }
      });
    }
    
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to save client configuration'
      }
    });
  }
});

module.exports = router;
