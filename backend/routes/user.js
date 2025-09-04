const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { query } = require('../database/unified-connection');

const router = express.Router();

// GET /api/user/status
// Get user's connection status for dashboard
router.get('/status', authenticateToken, async (req, res) => {
  try {
    // Get user's full information
    const userQuery = `
      SELECT id, email, first_name, last_name, company_name, created_at, last_login, email_verified
      FROM users
      WHERE id = $1
    `;
    const userResult = await query(userQuery, [req.user.id]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User account not found'
      });
    }
    
    const userDetails = userResult.rows[0];

    // Check if user has any connected services (graceful handling if table doesn't exist)
    let connectedServices = [];
    try {
      const credentialsQuery = `
        SELECT service_name, created_at, expiry_date
        FROM credentials
        WHERE user_id = $1
      `;
      const credentials = await query(credentialsQuery, [req.user.id]);
      connectedServices = credentials.rows.map(cred => ({
        service: cred.service_name,
        connected_at: cred.created_at,
        expires_at: cred.expiry_date
      }));
    } catch (credError) {
      console.log('Credentials table not found or accessible, continuing without service data');
    }

    // Check OAuth connections (graceful handling if table doesn't exist)
    let oauthServices = [];
    try {
      const oauthQuery = `
        SELECT provider, access_token, created_at, expires_at
        FROM oauth_tokens
        WHERE user_id = $1 AND access_token IS NOT NULL
      `;
      const oauthResult = await query(oauthQuery, [req.user.id]);
      oauthServices = oauthResult.rows.map(oauth => ({
        service: oauth.provider,
        connected_at: oauth.created_at,
        expires_at: oauth.expires_at,
        status: 'active'
      }));
    } catch (oauthError) {
      console.log('OAuth tokens table not found or accessible, continuing without OAuth data');
    }

    res.status(200).json({
      id: userDetails.id,
      email: userDetails.email,
      firstName: userDetails.first_name,
      lastName: userDetails.last_name,
      companyName: userDetails.company_name,
      createdAt: userDetails.created_at,
      lastLogin: userDetails.last_login,
      emailVerified: userDetails.email_verified || false,
      connected_services: connectedServices,
      oauth_connections: oauthServices,
      has_google_connection: connectedServices.some(service => service.service === 'google') ||
                            oauthServices.some(service => service.service === 'google' && service.status === 'active')
    });
  } catch (error) {
    console.error('User status error:', error);
    res.status(500).json({
      error: 'Failed to load user status',
      message: 'Something went wrong while loading user information'
    });
  }
});

// GET /api/user/profile
// Get user profile information
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const userQuery = `
      SELECT id, email, first_name, last_name, company_name, created_at, last_login, email_verified
      FROM users
      WHERE id = $1
    `;
    const userResult = await query(userQuery, [req.user.id]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User profile not found'
      });
    }
    
    const userDetails = userResult.rows[0];

    res.status(200).json({
      id: userDetails.id,
      email: userDetails.email,
      firstName: userDetails.first_name,
      lastName: userDetails.last_name,
      companyName: userDetails.company_name,
      createdAt: userDetails.created_at,
      lastLogin: userDetails.last_login,
      emailVerified: userDetails.email_verified || false
    });
  } catch (error) {
    console.error('User profile error:', error);
    res.status(500).json({
      error: 'Failed to load user profile',
      message: 'Something went wrong while loading user profile'
    });
  }
});

module.exports = router;
