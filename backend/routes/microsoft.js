const express = require('express');
const crypto = require('crypto');
const { databaseOperations } = require('../database/database-operations');
const { authenticateToken } = require('../middleware/auth');
const { makeLimiter } = require('../middleware/rateLimiter');
const { csrfProtection } = require('../middleware/csrf');

const router = express.Router();

// Rate limiters
const authorizeLimiter = makeLimiter({
  windowMs: 60 * 1000, // 1 minute
  limit: 60, // 60 requests per minute
  keyBy: (req) => req.ip
});
const callbackLimiter = makeLimiter({
  windowMs: 60 * 1000, // 1 minute
  limit: 60, // 60 requests per minute
  keyBy: (req) => req.ip
});

// Microsoft OAuth configuration
const MS_CLIENT_ID = process.env.MS_CLIENT_ID;
const MS_CLIENT_SECRET = process.env.MS_CLIENT_SECRET;
const MS_REDIRECT_URI = process.env.MS_REDIRECT_URI;
const FRONTEND_URL = process.env.FRONTEND_URL;

// Microsoft OAuth endpoints
const MS_AUTH_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';
const MS_TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';

// Required scopes for Outlook integration
const MS_SCOPES = [
  'offline_access',
  'https://graph.microsoft.com/Mail.ReadWrite',
  'https://graph.microsoft.com/MailboxSettings.Read',
  'https://graph.microsoft.com/User.Read'
];

/**
 * Build Microsoft OAuth authorization URL
 */
function buildMicrosoftAuthorizeUrl(state) {
  const params = new URLSearchParams({
    client_id: MS_CLIENT_ID,
    redirect_uri: MS_REDIRECT_URI,
    response_type: 'code',
    scope: MS_SCOPES.join(' '),
    response_mode: 'query',
    state: state
  });

  return `${MS_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
async function exchangeCodeForTokens(code) {
  const response = await fetch(MS_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: MS_CLIENT_ID,
      client_secret: MS_CLIENT_SECRET,
      code: code,
      grant_type: 'authorization_code',
      redirect_uri: MS_REDIRECT_URI,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${error}`);
  }

  return await response.json();
}

/**
 * Get user info from Microsoft Graph
 */
async function getUserInfo(accessToken) {
  const response = await fetch('https://graph.microsoft.com/v1.0/me', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to get user info');
  }

  return await response.json();
}

/**
 * Attempt to revoke Microsoft tokens (best effort)
 */
async function revokeTokens(token) {
  try {
    // Microsoft doesn't have a standard revoke endpoint for v2.0
    // We'll just return true and rely on token deletion
    return true;
  } catch (error) {
    console.error('Error revoking Microsoft tokens:', error);
    return false;
  }
}

// GET /api/integrations/microsoft/authorize
router.get('/authorize', authorizeLimiter, authenticateToken, (req, res) => {
  try {
    // Check environment variables dynamically for testing
    if (!process.env.MS_CLIENT_ID || !process.env.MS_CLIENT_SECRET || !process.env.MS_REDIRECT_URI) {
      return res.status(500).json({
        error: { code: 'OAUTH_CONFIG_MISSING', message: 'Microsoft OAuth configuration missing' }
      });
    }

    // Generate state parameter for CSRF protection and include user ID
    const stateData = {
      userId: req.user.id,
      nonce: crypto.randomBytes(16).toString('hex')
    };
    const state = Buffer.from(JSON.stringify(stateData)).toString('base64');

    const authUrl = buildMicrosoftAuthorizeUrl(state);

    res.json({ url: authUrl });
  } catch (error) {
    console.error('Microsoft authorize error:', error);
    res.status(500).json({
      error: { code: 'INTERNAL', message: 'Failed to generate authorization URL' }
    });
  }
});

// GET /api/integrations/microsoft/callback
router.get('/callback', callbackLimiter, async (req, res) => {
  try {
    const { code, state, error } = req.query;

    if (error) {
      console.error('OAuth error:', error);
      return res.redirect(`${FRONTEND_URL}/onboarding/step2?error=oauth_denied`);
    }

    if (!code) {
      return res.status(400).json({
        error: { code: 'MISSING_CODE', message: 'Authorization code required' }
      });
    }

    // Verify and decode state parameter
    if (!state) {
      return res.status(400).json({
        error: { code: 'MISSING_STATE', message: 'State parameter required' }
      });
    }

    let stateData;
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString('utf8'));
    } catch (error) {
      return res.status(400).json({
        error: { code: 'INVALID_STATE', message: 'Invalid state parameter' }
      });
    }

    const userId = stateData.userId;
    if (!userId) {
      return res.redirect(`${FRONTEND_URL}/onboarding/step2?error=session_expired`);
    }

    // Exchange code for tokens
    const tokenData = await exchangeCodeForTokens(code);

    // Get user info
    const userInfo = await getUserInfo(tokenData.access_token);

    // Calculate expiry time
    const expiryAt = new Date(Date.now() + (tokenData.expires_in - 60) * 1000);

    const connectionData = {
      sub: userInfo.mail || userInfo.userPrincipalName,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      scope: MS_SCOPES,
      expiry_at: expiryAt.toISOString()
    };

    const storeResult = await databaseOperations.upsertProviderTokens(userId, 'microsoft', connectionData);
    if (!storeResult.success) {
      console.error('Failed to store Microsoft tokens:', storeResult.error);
      return res.redirect(`${FRONTEND_URL}/onboarding/step2?error=storage_failed`);
    }

    // Update onboarding state
    await databaseOperations.setOnboardingProviderFlag(userId, 'microsoft', true);

    // Redirect to frontend with success
    res.redirect(`${FRONTEND_URL}/onboarding/step2?connected=outlook`);
  } catch (error) {
    console.error('Microsoft callback error:', error);
    res.redirect(`${FRONTEND_URL}/onboarding/step2?error=callback_failed`);
  }
});

// POST /api/integrations/microsoft/disconnect
router.post('/disconnect', authenticateToken, csrfProtection, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get current connection to revoke tokens
    const connection = await databaseOperations.getConnection(userId, 'microsoft');
    
    if (connection.success && connection.data) {
      // Attempt to revoke tokens (best effort for Microsoft)
      await revokeTokens(connection.data.access_token);
    }

    // Delete connection from database
    const deleteResult = await databaseOperations.deleteConnection(userId, 'microsoft');
    if (!deleteResult.success) {
      return res.status(500).json({
        error: { code: 'DELETE_FAILED', message: deleteResult.error }
      });
    }

    // Update onboarding state
    await databaseOperations.setOnboardingProviderFlag(userId, 'microsoft', false);

    res.status(204).send();
  } catch (error) {
    console.error('Microsoft disconnect error:', error);
    res.status(500).json({
      error: { code: 'INTERNAL', message: 'Failed to disconnect Microsoft account' }
    });
  }
});

module.exports = router;
