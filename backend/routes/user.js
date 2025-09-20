const express = require('express');
const { asyncHandler } = require('../middleware/standardErrorHandler');

const { databaseOperations } = require('../database/database-operations');
const { authenticateToken } = require('../middleware/auth');
const { oauthService } = require('../services/OAuthService');
const { ErrorResponse } = require('../utils/ErrorResponse');
const logger = require('../utils/logger');

const router = express.Router();

// GET /api/user/profile
// Get user's profile information
router.get('/profile', authenticateToken, asyncHandler(async (req, res) => {
  logger.debug('Getting user profile', { userId: req.user?.id });

  // Get user's profile information using REST API
  const userResult = await databaseOperations.getUserProfile(req.user.id);

  if (userResult.error || !userResult.data) {
    logger.warn('User profile not found', {
      userId: req.user.id,
      error: userResult.error
    });
    throw ErrorResponse.notFound('User account not found', req.requestId);
  }

  const userDetails = userResult.data;
  logger.debug('User profile retrieved successfully', {
    userId: userDetails.id,
    email: userDetails.email
  });

  successResponse(res, {
    id: userDetails.id,
    email: userDetails.email,
    firstName: userDetails.first_name,
    lastName: userDetails.last_name,
    companyName: userDetails.company_name,
    emailVerified: userDetails.email_verified,
    createdAt: userDetails.created_at,
    lastLogin: userDetails.last_login
  });
}));

// GET /api/user/settings
// Get user's settings and preferences
router.get('/settings', authenticateToken, asyncHandler(async (req, res) => {
  logger.debug('Getting user settings', { userId: req.user?.id });

  // Get user's settings from database
  const settingsResult = await databaseOperations.getUserSettings(req.user.id);

  // If no settings exist, return default settings
  const defaultSettings = {
    notifications: {
      email: true,
      browser: true,
      workflow: true
    },
    privacy: {
      analytics: true,
      marketing: false
    },
    preferences: {
      theme: 'light',
      language: 'en',
      timezone: 'UTC'
    }
  };

  const settings = settingsResult.data || defaultSettings;

  successResponse(res, {
    settings: settings,
    userId: req.user.id
  });
}));

// PUT /api/user/settings
// Update user's settings and preferences
router.put('/settings', authenticateToken, asyncHandler(async (req, res) => {
  logger.debug('Updating user settings', { userId: req.user?.id });

  const { notifications, privacy, preferences } = req.body;

  // Validate settings structure
  const settingsData = {
    notifications: notifications || {},
    privacy: privacy || {},
    preferences: preferences || {}
  };

  // Update user settings in database
  const updateResult = await databaseOperations.updateUserSettings(req.user.id, settingsData);

  if (updateResult.error) {
    logger.error('Failed to update user settings', {
      userId: req.user.id,
      error: updateResult.error
    });
    throw ErrorResponse.internal('Failed to update settings', req.requestId);
  }

  successResponse(res, {
    message: 'Settings updated successfully',
    settings: settingsData
  });
}));

// PUT /api/user/profile
// Update user's profile information
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    console.log('🔄 Updating user profile for user:', req.user?.id);

    const { firstName, lastName, companyName } = req.body;

    // Validate input
    if (!firstName || firstName.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'First name is required'
      });
    }

    const profileData = {
      first_name: firstName.trim(),
      last_name: lastName ? lastName.trim() : null,
      company_name: companyName ? companyName.trim() : null
    };

    // Update user profile using REST API
    const updateResult = await databaseOperations.updateUserProfile(req.user.id, profileData);

    if (updateResult.error) {
      console.error('Profile update error:', updateResult.error);
      return res.status(500).json({
        success: false,
        error: 'Database error',
        message: 'Failed to update profile',
        details: updateResult.error.message
      });
    }

    const updatedUser = updateResult.data;

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.first_name,
        lastName: updatedUser.last_name,
        companyName: updatedUser.company_name,
        emailVerified: updatedUser.email_verified
      }
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to update profile',
      details: error.message
    });
  }
});

// GET /api/user/status
// Get user's connection status for dashboard
router.get('/status', authenticateToken, asyncHandler(async (req, res) => {
  logger.debug('Getting user status', { userId: req.user?.id });

  // Get user's profile information using REST API
  const userResult = await databaseOperations.getUserProfile(req.user.id);

  if (userResult.error || !userResult.data) {
    logger.warn('User status fetch failed', {
      userId: req.user.id,
      error: userResult.error
    });
    throw ErrorResponse.notFound('User account not found', req.requestId);
  }

  const userDetails = userResult.data;

  // Check if user has any connected services using REST API
  logger.debug('Checking connected services', { userId: req.user.id });
  const servicesResult = await databaseOperations.getUserConnectedServices(req.user.id);
  const connectedServices = (servicesResult.data || []).map(cred => ({
    service: cred.service_name,
    connected_at: cred.created_at,
    expires_at: cred.expiry_date
  }));

  // Check OAuth connections using OAuth service
  logger.debug('Checking OAuth services', { userId: req.user.id });
  const oauthServices = oauthService.getOAuthConnections(req.user.id);

  logger.debug('User status retrieved successfully', {
    userId: userDetails.id,
    email: userDetails.email,
    connectedServicesCount: connectedServices.length,
    oauthServicesCount: oauthServices.length
  });

  successResponse(res, {
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
    has_google_connection:
      connectedServices.some(service => service.service === 'google') ||
      oauthServices.some(service => service.service === 'google' && service.status === 'active')
  });
}));

module.exports = router;
