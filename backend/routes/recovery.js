const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const onboardingSessionService = require('../services/onboardingSessionService');
const transactionService = require('../services/transactionService');
const gmailService = require('../services/gmailService');

const router = express.Router();

// GET /api/recovery/session
// Get current session and recovery information
router.get('/session', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const recoveryInfo = await onboardingSessionService.getRecoveryInfo(userId);

    res.json({
      success: true,
      recovery: recoveryInfo
    });

  } catch (error) {
    console.error('Error getting recovery info:', error);
    res.status(500).json({
      error: 'Failed to get recovery information',
      message: error.message
    });
  }
});

// POST /api/recovery/resume
// Resume onboarding from last checkpoint
router.post('/resume', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { fromStep } = req.body;

    const session = await onboardingSessionService.createOrResumeSession(userId, fromStep);

    res.json({
      success: true,
      session: {
        sessionId: session.sessionId,
        currentStep: session.currentStep,
        resumed: session.resumed,
        progress: session.progress
      },
      message: session.resumed ? 'Session resumed successfully' : 'New session created'
    });

  } catch (error) {
    console.error('Error resuming session:', error);
    res.status(500).json({
      error: 'Failed to resume session',
      message: error.message
    });
  }
});

// POST /api/recovery/retry
// Retry a failed step
router.post('/retry', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { step, failureId } = req.body;

    if (!step || !failureId) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Step and failureId are required'
      });
    }

    const retryResult = await onboardingSessionService.retryFailedStep(userId, step, failureId);

    res.json({
      success: true,
      retry: retryResult,
      message: `Retry attempt ${retryResult.retryAttempt} of ${retryResult.maxRetries} for step: ${step}`
    });

  } catch (error) {
    console.error('Error retrying step:', error);
    res.status(400).json({
      error: 'Failed to retry step',
      message: error.message
    });
  }
});

// POST /api/recovery/rollback
// Rollback to a specific checkpoint
router.post('/rollback', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { toStep, reason } = req.body;

    if (!toStep) {
      return res.status(400).json({
        error: 'Missing required field',
        message: 'toStep is required'
      });
    }

    // Create new session from the specified step
    const session = await onboardingSessionService.createOrResumeSession(userId, toStep);

    // Log the rollback
    console.log(`User ${userId} rolled back to step: ${toStep}. Reason: ${reason || 'User requested'}`);

    res.json({
      success: true,
      rollback: {
        toStep,
        sessionId: session.sessionId,
        reason: reason || 'User requested rollback'
      },
      message: `Successfully rolled back to step: ${toStep}`
    });

  } catch (error) {
    console.error('Error rolling back:', error);
    res.status(500).json({
      error: 'Failed to rollback',
      message: error.message
    });
  }
});

// POST /api/recovery/refresh-oauth
// Refresh OAuth connection for recovery
router.post('/refresh-oauth', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Check if user has existing OAuth credentials
    const { pool } = require('../database/connection');
    const credQuery = 'SELECT id FROM credentials WHERE user_id = $1 AND service_name = $2';
    const credResult = await pool.query(credQuery, [userId, 'google']);

    if (credResult.rows.length === 0) {
      return res.status(404).json({
        error: 'No OAuth connection found',
        message: 'Please connect your Google account first',
        suggestedAction: 'redirect_to_oauth'
      });
    }

    // Test the connection
    try {
      await gmailService.getGmailProfile(userId);
      
      res.json({
        success: true,
        oauth: {
          status: 'valid',
          message: 'OAuth connection is working properly'
        }
      });

    } catch (oauthError) {
      // OAuth token might be expired or invalid
      res.status(401).json({
        error: 'OAuth connection invalid',
        message: 'Your Google connection has expired. Please reconnect.',
        suggestedAction: 'redirect_to_oauth',
        oauthError: oauthError.message
      });
    }

  } catch (error) {
    console.error('Error refreshing OAuth:', error);
    res.status(500).json({
      error: 'Failed to refresh OAuth',
      message: error.message
    });
  }
});

// GET /api/recovery/health
// Check system health for recovery purposes
router.get('/health', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const healthChecks = {
      database: false,
      gmail: false,
      session: false,
      timestamp: new Date()
    };

    // Check database connection
    try {
      const { pool } = require('../database/connection');
      await pool.query('SELECT 1');
      healthChecks.database = true;
    } catch (dbError) {
      console.error('Database health check failed:', dbError);
    }

    // Check Gmail API connection
    try {
      await gmailService.getGmailProfile(userId);
      healthChecks.gmail = true;
    } catch (gmailError) {
      // Gmail connection might be expected to fail if not connected
      healthChecks.gmailError = gmailError.message;
    }

    // Check session service
    try {
      await onboardingSessionService.getRecoveryInfo(userId);
      healthChecks.session = true;
    } catch (sessionError) {
      console.error('Session health check failed:', sessionError);
    }

    const overallHealth = healthChecks.database && healthChecks.session;

    res.json({
      success: true,
      health: {
        ...healthChecks,
        overall: overallHealth ? 'healthy' : 'degraded'
      }
    });

  } catch (error) {
    console.error('Error checking health:', error);
    res.status(500).json({
      error: 'Health check failed',
      message: error.message
    });
  }
});

// GET /api/recovery/diagnostics
// Get detailed diagnostics for troubleshooting
router.get('/diagnostics', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const diagnostics = {
      user: {},
      session: {},
      transactions: {},
      errors: {},
      timestamp: new Date()
    };

    // User diagnostics
    const { pool } = require('../database/connection');
    const userQuery = `
      SELECT id, email, email_verified, onboarding_completed, 
             trial_started_at, trial_ends_at, subscription_status
      FROM users WHERE id = $1
    `;
    const userResult = await pool.query(userQuery, [userId]);
    diagnostics.user = userResult.rows[0] || {};

    // Session diagnostics
    const recoveryInfo = await onboardingSessionService.getRecoveryInfo(userId);
    diagnostics.session = recoveryInfo;

    // Transaction diagnostics
    const activeTransactions = transactionService.getActiveTransactions();
    diagnostics.transactions = {
      active: activeTransactions.length,
      userTransactions: activeTransactions.filter(t => t.id.includes(userId))
    };

    // Recent errors
    const errorQuery = `
      SELECT step, error_message, timestamp, recovery_attempts
      FROM onboarding_failures 
      WHERE user_id = $1 
      ORDER BY timestamp DESC 
      LIMIT 10
    `;
    const errorResult = await pool.query(errorQuery, [userId]);
    diagnostics.errors = {
      recent: errorResult.rows,
      total: errorResult.rows.length
    };

    res.json({
      success: true,
      diagnostics
    });

  } catch (error) {
    console.error('Error getting diagnostics:', error);
    res.status(500).json({
      error: 'Failed to get diagnostics',
      message: error.message
    });
  }
});

// POST /api/recovery/clear-errors
// Clear error history for a fresh start
router.post('/clear-errors', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { olderThan } = req.body; // Optional: clear errors older than X hours

    let query = 'DELETE FROM onboarding_failures WHERE user_id = $1';
    let params = [userId];

    if (olderThan) {
      query += ' AND timestamp < $2';
      const cutoffTime = new Date(Date.now() - olderThan * 60 * 60 * 1000);
      params.push(cutoffTime);
    }

    const { pool } = require('../database/connection');
    const result = await pool.query(query, params);

    res.json({
      success: true,
      cleared: {
        errorCount: result.rowCount,
        olderThan: olderThan ? `${olderThan} hours` : 'all errors'
      },
      message: `Cleared ${result.rowCount} error records`
    });

  } catch (error) {
    console.error('Error clearing errors:', error);
    res.status(500).json({
      error: 'Failed to clear errors',
      message: error.message
    });
  }
});

module.exports = router;
