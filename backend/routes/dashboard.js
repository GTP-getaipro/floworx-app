const express = require('express');

const { getUserById, getRecentActivities, getOAuthConnections } = require('../database/unified-connection');
const { authenticateToken } = require('../middleware/auth');
const { asyncHandler, successResponse } = require('../middleware/standardErrorHandler');
const { ErrorResponse } = require('../utils/ErrorResponse');
const logger = require('../utils/logger');

const router = express.Router();

// GET /api/dashboard
// Get user dashboard data
router.get('/', authenticateToken, async (req, res) => {
  try {
    logger.info('Dashboard endpoint called', { userId: req.user?.id });

    // Get user's full information using REST API
    const userDetails = await getUserById(req.user.id);

    if (!userDetails) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User account not found',
          statusCode: 404,
          timestamp: new Date().toISOString(),
          requestId: req.id
        }
      });
    }

    // Get recent activities using REST API (graceful handling)
    const recentActivities = await getRecentActivities(req.user.id, 5);

    // Get connection status using REST API (graceful handling)
    const connections = await getOAuthConnections(req.user.id);

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

    res.status(200).json({
      success: true,
      data: dashboardData,
      timestamp: new Date().toISOString(),
      requestId: req.id
    });
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
