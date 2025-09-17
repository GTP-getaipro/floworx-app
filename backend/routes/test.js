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

module.exports = router;
