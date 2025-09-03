const express = require('express');
const { google } = require('googleapis');
const { query } = require('../database/unified-connection');
const { encrypt, decrypt } = require('../utils/encryption');
const { authenticateToken } = require('../middleware/auth');
const { NotFoundError, ExternalServiceError, asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Google OAuth2 client configuration
const getGoogleOAuth2Client = () => {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
};

// GET /api/oauth/google
// Initiate Google OAuth flow
router.get('/google', authenticateToken, (req, res) => {
  try {
    const oauth2Client = getGoogleOAuth2Client();

    // Generate the consent screen URL
    const scopes = [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
      // Add additional scopes as needed for your automation
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/calendar.readonly'
    ];

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline', // Required to get refresh token
      scope: scopes,
      state: req.user.id, // Pass user ID to callback
      prompt: 'consent' // Force consent screen to ensure refresh token
    });

    // Redirect user to Google consent screen
    res.redirect(authUrl);
  } catch (error) {
    console.error('OAuth initiation error:', error);
    res.status(500).json({
      error: 'OAuth initiation failed',
      message: 'Unable to start Google authentication process'
    });
  }
});

// GET /api/oauth/google/callback
// Handle Google OAuth callback
router.get('/google/callback', async (req, res) => {
  try {
    const { code, state, error } = req.query;

    // Handle OAuth errors
    if (error) {
      console.error('OAuth error from Google:', error);
      return res.redirect(`${process.env.FRONTEND_URL}/dashboard?error=oauth_denied`);
    }

    if (!code || !state) {
      return res.redirect(`${process.env.FRONTEND_URL}/dashboard?error=invalid_callback`);
    }

    const userId = state; // User ID passed in state parameter
    const oauth2Client = getGoogleOAuth2Client();

    // Exchange authorization code for tokens
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.access_token) {
      throw new Error('No access token received from Google');
    }

    // Encrypt the tokens before storing
    const encryptedAccessToken = encrypt(tokens.access_token);
    const encryptedRefreshToken = tokens.refresh_token ? encrypt(tokens.refresh_token) : null;

    // Calculate expiry date
    const expiryDate = tokens.expiry_date ? new Date(tokens.expiry_date) : null;

    // Store or update credentials in database
    const upsertCredentialQuery = `
      INSERT INTO credentials (user_id, service_name, access_token, refresh_token, expiry_date)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (user_id, service_name)
      DO UPDATE SET 
        access_token = EXCLUDED.access_token,
        refresh_token = EXCLUDED.refresh_token,
        expiry_date = EXCLUDED.expiry_date,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id
    `;

    await query(upsertCredentialQuery, [userId, 'google', encryptedAccessToken, encryptedRefreshToken, expiryDate]);

    // Redirect back to frontend dashboard with success
    res.redirect(`${process.env.FRONTEND_URL}/dashboard?connected=google`);
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.redirect(`${process.env.FRONTEND_URL}/dashboard?error=connection_failed`);
  }
});

// DELETE /api/oauth/google
// Disconnect Google account
router.delete('/google', authenticateToken, asyncHandler(async (req, res) => {
  const deleteQuery = 'DELETE FROM credentials WHERE user_id = $1 AND service_name = $2';
  const result = await query(deleteQuery, [req.user.id, 'google']);

  if (result.rowCount === 0) {
    throw new NotFoundError('No Google connection found for this user');
  }

  res.json({
    success: true,
    message: 'Google account disconnected successfully'
  });
}));

// GET /api/oauth/google/refresh
// Refresh Google access token (internal use)
const refreshGoogleToken = async userId => {
  try {
    // Get current credentials
    const credQuery = 'SELECT access_token, refresh_token FROM credentials WHERE user_id = $1 AND service_name = $2';
    const credResult = await query(credQuery, [userId, 'google']);

    if (credResult.rows.length === 0) {
      throw new Error('No Google credentials found for user');
    }

    const { refresh_token } = credResult.rows[0];
    if (!refresh_token) {
      throw new Error('No refresh token available');
    }

    // Decrypt refresh token
    const decryptedRefreshToken = decrypt(refresh_token);

    // Use refresh token to get new access token
    const oauth2Client = getGoogleOAuth2Client();
    oauth2Client.setCredentials({ refresh_token: decryptedRefreshToken });

    const { credentials } = await oauth2Client.refreshAccessToken();

    // Encrypt and update new access token
    const encryptedAccessToken = encrypt(credentials.access_token);
    const expiryDate = credentials.expiry_date ? new Date(credentials.expiry_date) : null;

    const updateQuery = `
      UPDATE credentials 
      SET access_token = $1, expiry_date = $2, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $3 AND service_name = $4
    `;

    await query(updateQuery, [encryptedAccessToken, expiryDate, userId, 'google']);

    return credentials.access_token;
  } catch (error) {
    console.error('Token refresh error:', error);
    throw error;
  }
};

module.exports = {
  router,
  refreshGoogleToken
};
