const express = require('express');

const { query } = require('../database/unified-connection');
const { authenticateToken } = require('../middleware/auth');
const { asyncHandler, successResponse } = require('../middleware/standardErrorHandler');
const { ErrorResponse } = require('../utils/ErrorResponse');
const logger = require('../utils/logger');

const router = express.Router();

// GET /api/dashboard
// Get user dashboard data
router.get('/', authenticateToken, async (req, res) => {
  try {
    console.log('Dashboard endpoint called for user:', req.user?.id);

    // Get user's full information
    const userQuery = `
      SELECT id, email, first_name, last_name, company_name, created_at, last_login
      FROM users
      WHERE id = $1
    `;
    const userResult = await query(userQuery, [req.user.id]);
    console.log('Dashboard user query result:', userResult.rows.length, 'rows');
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User account not found'
      });
    }
    
    const userDetails = userResult.rows[0];

    // Get recent activities (graceful handling)
    let recentActivities = [];
    try {
      const activitiesQuery = `
        SELECT action, ip_address, created_at
        FROM security_audit_log
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 5
      `;
      const activitiesResult = await query(activitiesQuery, [req.user.id]);
      recentActivities = activitiesResult.rows.map(activity => ({
        action: activity.action,
        timestamp: activity.created_at,
        ip_address: activity.ip_address
      }));
    } catch (_actError) {
      console.log('Activities data not available, continuing without recent activities');
    }

    // Get connection status
    const connections = { google: { connected: false } };
    try {
      const oauthQuery = `
        SELECT provider, created_at
        FROM oauth_tokens
        WHERE user_id = $1 AND access_token IS NOT NULL
      `;
      const oauthResult = await query(oauthQuery, [req.user.id]);
      
      oauthResult.rows.forEach(oauth => {
        connections[oauth.provider] = {
          connected: true,
          connected_at: oauth.created_at
        };
      });
    } catch (_oauthError) {
      console.log('OAuth data not available, showing default connection status');
    }

    const dashboardData = {
      user: {
        id: userDetails.id,
        email: userDetails.email,
        firstName: userDetails.first_name,
        lastName: userDetails.last_name,
        companyName: userDetails.company_name,
        createdAt: userDetails.created_at,
        lastLogin: userDetails.last_login
      },
      connections: connections,
      recentActivities: recentActivities,
      quickActions: [
        {
          id: 'connect_google',
          title: 'Connect Google Account',
          description: 'Connect your Google account to start automating emails',
          action: '/api/oauth/google',
          enabled: !connections.google?.connected,
          priority: 1
        },
        {
          id: 'create_workflow',
          title: 'Create First Workflow',
          description: 'Set up your first email automation workflow',
          action: '/workflows/create',
          enabled: connections.google?.connected,
          priority: 2
        }
      ],
      systemStatus: {
        apiHealthy: true,
        databaseConnected: true,
        lastUpdated: new Date().toISOString()
      }
    };

    res.status(200).json(dashboardData);
  } catch (error) {
    logger.error('Dashboard error', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id
    });

    const errorResponse = ErrorResponse.internal('Failed to load dashboard data', {
      originalError: error.message,
      userId: req.user?.id
    }, req.requestId);

    errorResponse.send(res, req);
  }
});

// GET /api/dashboard/status
// Get dashboard status
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get basic user info
    const userQuery = 'SELECT id, email, first_name, last_name FROM users WHERE id = $1';
    const userResult = await query(userQuery, [userId]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User account not found'
      });
    }

    res.json({
      success: true,
      status: 'active',
      user: userResult.rows[0],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Dashboard status error:', error);
    res.status(500).json({
      error: 'Failed to get dashboard status',
      message: error.message
    });
  }
});

module.exports = router;
