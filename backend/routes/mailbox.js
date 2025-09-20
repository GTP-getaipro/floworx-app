/**
 * Mailbox Discovery & Provisioning Routes
 * Handles mailbox taxonomy discovery, provisioning, and mapping persistence
 */

const express = require('express');
const { body, query, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { authenticateToken } = require('../middleware/auth');
const { csrfProtection } = require('../middleware/csrf');
const { query: dbQuery } = require('../database/unified-connection');

// Import mailbox services
const GmailMailboxService = require('../services/mailbox/gmail');
const O365MailboxService = require('../services/mailbox/o365');
const MailboxSuggestionService = require('../services/mailbox/suggest');

const router = express.Router();

// Rate limiters
const discoveryLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  message: { error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many discovery requests' } },
  standardHeaders: true,
  legacyHeaders: false
});

const provisionLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  message: { error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many provision requests' } },
  standardHeaders: true,
  legacyHeaders: false
});

// Service instances
const gmailService = new GmailMailboxService();
const o365Service = new O365MailboxService();
const suggestionService = new MailboxSuggestionService();

/**
 * GET /api/mailbox/discover
 * Discover existing mailbox taxonomy and suggest mapping
 */
router.get('/discover',
  authenticateToken,
  discoveryLimiter,
  [
    query('provider')
      .isIn(['gmail', 'o365'])
      .withMessage('Provider must be gmail or o365'),
    query('businessType')
      .optional()
      .isString()
      .isLength({ min: 1, max: 50 })
      .withMessage('Business type must be a string between 1-50 characters')
  ],
  async (req, res) => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request parameters',
            details: errors.array()
          }
        });
      }

      const { provider, businessType = 'default' } = req.query;
      const userId = req.user.id;

      // Select appropriate service
      let mailboxService;
      if (provider === 'gmail') {
        mailboxService = gmailService;
      } else if (provider === 'o365') {
        mailboxService = o365Service;
      } else {
        return res.status(400).json({
          error: {
            code: 'UNSUPPORTED_PROVIDER',
            message: 'Unsupported email provider'
          }
        });
      }

      // Discover existing mailbox taxonomy
      const discoveredData = await mailboxService.discover(userId);

      // Generate suggestions
      const suggestions = suggestionService.suggest(discoveredData, businessType);

      // Return discovery results with suggestions
      res.json({
        provider: provider,
        businessType: businessType,
        existing: {
          totalItems: discoveredData.totalLabels || discoveredData.totalFolders || 0,
          userItems: discoveredData.userLabels || discoveredData.userFolders || 0,
          systemItems: discoveredData.systemLabels || discoveredData.systemFolders || 0,
          items: discoveredData.labels || discoveredData.folders || [],
          taxonomy: discoveredData.taxonomy
        },
        suggestedMapping: suggestions.suggestedMapping,
        suggestions: suggestions.suggestions,
        analysis: suggestions.analysis,
        missingCount: suggestions.missingCount,
        discoveredAt: discoveredData.discoveredAt
      });

    } catch (error) {
      console.error('Mailbox discovery error:', error);
      res.status(500).json({
        error: {
          code: 'DISCOVERY_FAILED',
          message: 'Failed to discover mailbox taxonomy',
          details: error.message
        }
      });
    }
  }
);

/**
 * POST /api/mailbox/provision
 * Provision missing labels/folders/categories
 */
router.post('/provision',
  authenticateToken,
  csrfProtection,
  provisionLimiter,
  [
    body('provider')
      .isIn(['gmail', 'o365'])
      .withMessage('Provider must be gmail or o365'),
    body('items')
      .isArray({ min: 1, max: 50 })
      .withMessage('Items must be an array with 1-50 items'),
    body('items.*.path')
      .isArray({ min: 1, max: 5 })
      .withMessage('Each item path must be an array with 1-5 segments'),
    body('items.*.path.*')
      .isString()
      .isLength({ min: 1, max: 100 })
      .withMessage('Path segments must be strings between 1-100 characters'),
    body('items.*.color')
      .optional()
      .matches(/^#[0-9A-F]{6}$/i)
      .withMessage('Color must be a valid hex color code')
  ],
  async (req, res) => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request parameters',
            details: errors.array()
          }
        });
      }

      const { provider, items } = req.body;
      const userId = req.user.id;

      // Select appropriate service
      let mailboxService;
      if (provider === 'gmail') {
        mailboxService = gmailService;
      } else if (provider === 'o365') {
        mailboxService = o365Service;
      } else {
        return res.status(400).json({
          error: {
            code: 'UNSUPPORTED_PROVIDER',
            message: 'Unsupported email provider'
          }
        });
      }

      // Provision items (idempotent operation)
      const results = await mailboxService.provision(userId, items);

      res.json({
        ok: true,
        provider: provider,
        created: results.created,
        skipped: results.skipped,
        failed: results.failed,
        summary: {
          totalRequested: items.length,
          totalCreated: results.created.length,
          totalSkipped: results.skipped.length,
          totalFailed: results.failed.length
        },
        provisionedAt: new Date().toISOString()
      });

    } catch (error) {
      console.error('Mailbox provision error:', error);
      res.status(500).json({
        error: {
          code: 'PROVISION_FAILED',
          message: 'Failed to provision mailbox items',
          details: error.message
        }
      });
    }
  }
);

/**
 * PUT /api/mailbox/mapping
 * Persist final mailbox mapping and bump version
 */
router.put('/mapping',
  authenticateToken,
  csrfProtection,
  [
    body('provider')
      .isIn(['gmail', 'o365'])
      .withMessage('Provider must be gmail or o365'),
    body('mapping')
      .isObject()
      .withMessage('Mapping must be an object'),
    body('clientId')
      .optional()
      .isUUID()
      .withMessage('Client ID must be a valid UUID')
  ],
  async (req, res) => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request parameters',
            details: errors.array()
          }
        });
      }

      const { provider, mapping, clientId = null } = req.body;
      const userId = req.user.id;

      // Upsert mailbox mapping with version bump
      const upsertQuery = `
        INSERT INTO mailbox_mappings (user_id, provider, client_id, mapping, version)
        VALUES ($1, $2, $3, $4, 1)
        ON CONFLICT (user_id, provider)
        DO UPDATE SET
          client_id = EXCLUDED.client_id,
          mapping = EXCLUDED.mapping,
          version = mailbox_mappings.version + 1,
          updated_at = NOW()
        RETURNING version, updated_at
      `;

      const result = await dbQuery(upsertQuery, [
        userId,
        provider,
        clientId,
        JSON.stringify(mapping)
      ]);

      if (result.rows.length === 0) {
        throw new Error('Failed to save mailbox mapping');
      }

      const { version, updated_at } = result.rows[0];

      res.json({
        ok: true,
        provider: provider,
        version: version,
        updatedAt: updated_at,
        mappingKeys: Object.keys(mapping).length
      });

    } catch (error) {
      console.error('Mailbox mapping save error:', error);
      res.status(500).json({
        error: {
          code: 'MAPPING_SAVE_FAILED',
          message: 'Failed to save mailbox mapping',
          details: error.message
        }
      });
    }
  }
);

/**
 * GET /api/mailbox/mapping
 * Retrieve saved mailbox mapping
 */
router.get('/mapping',
  authenticateToken,
  [
    query('provider')
      .isIn(['gmail', 'o365'])
      .withMessage('Provider must be gmail or o365')
  ],
  async (req, res) => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request parameters',
            details: errors.array()
          }
        });
      }

      const { provider } = req.query;
      const userId = req.user.id;

      // Retrieve mailbox mapping
      const selectQuery = `
        SELECT client_id, mapping, version, created_at, updated_at
        FROM mailbox_mappings
        WHERE user_id = $1 AND provider = $2
      `;

      const result = await dbQuery(selectQuery, [userId, provider]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: {
            code: 'MAPPING_NOT_FOUND',
            message: 'No mailbox mapping found for this provider'
          }
        });
      }

      const row = result.rows[0];

      res.json({
        provider: provider,
        clientId: row.client_id,
        mapping: row.mapping,
        version: row.version,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      });

    } catch (error) {
      console.error('Mailbox mapping retrieval error:', error);
      res.status(500).json({
        error: {
          code: 'MAPPING_RETRIEVAL_FAILED',
          message: 'Failed to retrieve mailbox mapping',
          details: error.message
        }
      });
    }
  }
);

module.exports = router;
