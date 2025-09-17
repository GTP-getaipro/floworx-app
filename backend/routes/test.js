/**
 * Test-only Routes
 * These routes are only available when NODE_ENV === 'test'
 * Used for testing and development purposes
 */

const express = require('express');
const { databaseOperations } = require('../database/database-operations');

const router = express.Router();

// POST /api/test/mark-verified - Mark user as verified (TEST ONLY)
router.post('/mark-verified', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: { code: "BAD_REQUEST", message: "Email is required" }
      });
    }

    // Get user by email
    const userResult = await databaseOperations.getUserByEmail(email);
    if (!userResult.data) {
      return res.status(404).json({
        error: { code: "USER_NOT_FOUND", message: "User not found" }
      });
    }

    // Mark user as verified by updating email_verified
    const updateResult = await databaseOperations.updateUser(userResult.data.id, {
      email_verified: true
    });

    if (updateResult.error) {
      return res.status(500).json({
        error: { code: "INTERNAL", message: "Failed to verify user" }
      });
    }

    res.status(200).json({ success: true });

  } catch (error) {
    console.error('Test mark-verified error:', error);
    res.status(500).json({
      error: { code: "INTERNAL", message: "Unexpected error" }
    });
  }
});

// GET /api/test/last-verification-token?email=... - Get last verification token for user (TEST ONLY)
router.get('/last-verification-token', async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({
        error: { code: "BAD_REQUEST", message: "Email is required" }
      });
    }

    // Get user by email
    const userResult = await databaseOperations.getUserByEmail(email);
    if (!userResult.data) {
      return res.status(404).json({
        error: { code: "USER_NOT_FOUND", message: "User not found" }
      });
    }

    // Get the most recent verification token for this user
    const { type, client } = await databaseOperations.getClient();

    let tokenResult;
    if (type === 'REST_API') {
      tokenResult = await client.getAdminClient()
        .from('email_verification_tokens')
        .select('token')
        .eq('user_id', userResult.data.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
    } else {
      // PostgreSQL implementation
      const query = `
        SELECT token
        FROM email_verification_tokens
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 1
      `;
      const result = await client.query(query, [userResult.data.id]);
      tokenResult = { data: result.rows[0] || null, error: null };
    }

    if (!tokenResult.data) {
      return res.status(404).json({
        error: { code: "TOKEN_NOT_FOUND", message: "No verification token found" }
      });
    }

    res.status(200).json({
      token: tokenResult.data.token
    });

  } catch (error) {
    console.error('Test last-verification-token error:', error);
    res.status(500).json({
      error: { code: "INTERNAL", message: "Unexpected error" }
    });
  }
});

module.exports = router;
