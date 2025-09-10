const express = require('express');

const router = express.Router();
const rateLimit = require('express-rate-limit');

const { authenticateToken } = require('../middleware/auth');
const accountRecoveryService = require('../services/accountRecoveryService');
const passwordResetService = require('../services/passwordResetService');

// Rate limiting for recovery requests
const recoveryRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    success: false,
    error: 'Too many recovery requests. Please try again later.',
    retryAfter: 15 * 60 // seconds
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiting for token verification
const verifyRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: {
    success: false,
    error: 'Too many verification attempts. Please try again later.'
  }
});

// POST /api/account-recovery/initiate
// Initiate account recovery process
router.post('/initiate', recoveryRateLimit, async (req, res) => {
  try {
    const { email, recoveryType, recoveryData } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    if (!email || !recoveryType) {
      return res.status(400).json({
        success: false,
        error: 'Email and recovery type are required'
      });
    }

    // Validate recovery type
    const validTypes = ['email_change', 'account_recovery', 'emergency_access', 'account_lockout'];
    if (!validTypes.includes(recoveryType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid recovery type'
      });
    }

    const result = await accountRecoveryService.initiateAccountRecovery(
      email,
      recoveryType,
      recoveryData || {},
      ipAddress,
      userAgent
    );

    res.json(result);
  } catch (error) {
    console.error('Recovery initiation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initiate account recovery'
    });
  }
});

// POST /api/account-recovery/verify-token
// Verify recovery token
router.post('/verify-token', verifyRateLimit, async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        valid: false,
        error: 'Recovery token is required'
      });
    }

    const result = await accountRecoveryService.verifyRecoveryToken(token);
    res.json(result);
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({
      valid: false,
      error: 'Failed to verify recovery token'
    });
  }
});

// POST /api/account-recovery/complete
// Complete account recovery
router.post('/complete', async (req, res) => {
  try {
    const { token, recoveryActions } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Recovery token is required'
      });
    }

    if (!recoveryActions || typeof recoveryActions !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Recovery actions are required'
      });
    }

    const result = await accountRecoveryService.completeAccountRecovery(token, recoveryActions, ipAddress, userAgent);

    res.json(result);
  } catch (error) {
    console.error('Recovery completion error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to complete account recovery'
    });
  }
});

// POST /api/account-recovery/check-lockout
// Check account lockout status
router.post('/check-lockout', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    const result = await passwordResetService.checkAccountLockout(email);
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Lockout check error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check account lockout status'
    });
  }
});

// POST /api/account-recovery/unlock-account
// Unlock account (admin or recovery process)
router.post('/unlock-account', authenticateToken, async (req, res) => {
  try {
    const { userId, reason } = req.body;
    const adminId = req.user.id;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    // Check if user has admin privileges or is unlocking their own account
    if (req.user.role !== 'admin' && req.user.id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }

    const result = await passwordResetService.unlockAccount(userId, reason || 'manual_unlock', adminId);

    res.json(result);
  } catch (error) {
    console.error('Account unlock error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to unlock account'
    });
  }
});

// GET /api/account-recovery/backup-codes
// Generate backup codes for account recovery
router.get('/backup-codes', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const codes = await accountRecoveryService.generateBackupCodes(10);

    // Store encrypted backup codes in database
    const backupResult = await accountRecoveryService.createCredentialBackup(userId, 'backup_codes', {
      codes,
      generatedAt: new Date().toISOString()
    });

    if (backupResult.success) {
      res.json({
        success: true,
        codes,
        message: 'Backup codes generated successfully. Store these in a safe place.',
        backupId: backupResult.backupId
      });
    } else {
      throw new Error('Failed to store backup codes');
    }
  } catch (error) {
    console.error('Backup codes generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate backup codes'
    });
  }
});

// POST /api/account-recovery/verify-backup-code
// Verify backup code for recovery
router.post('/verify-backup-code', async (req, res) => {
  try {
    const { email, backupCode } = req.body;

    if (!email || !backupCode) {
      return res.status(400).json({
        success: false,
        error: 'Email and backup code are required'
      });
    }

    // This would need to be implemented in the account recovery service
    // For now, return a placeholder response
    res.json({
      success: false,
      error: 'Backup code verification not yet implemented'
    });
  } catch (error) {
    console.error('Backup code verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify backup code'
    });
  }
});

// GET /api/account-recovery/security-log/:userId
// Get security audit log for user (admin or self)
router.get('/security-log/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit: _limit = 50, offset: _offset = 0 } = req.query;

    // Check permissions
    if (req.user.role !== 'admin' && req.user.id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }

    // This would query the security_audit_log table
    // For now, return a placeholder response
    res.json({
      success: true,
      logs: [],
      total: 0,
      message: 'Security log retrieval not yet implemented'
    });
  } catch (error) {
    console.error('Security log retrieval error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve security log'
    });
  }
});

module.exports = router;
