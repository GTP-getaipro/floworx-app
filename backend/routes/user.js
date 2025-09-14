const express = require('express');

const { databaseOperations } = require('../database/database-operations');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// GET /api/user/profile
// Get user's profile information
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 Getting user profile for user:', req.user?.id);

    // Get user's profile information using REST API
    const userResult = await databaseOperations.getUserProfile(req.user.id);

    if (userResult.error || !userResult.data) {
      console.error('User profile fetch error:', userResult.error);
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'User account not found'
      });
    }

    const userDetails = userResult.data;
    console.log(`✅ Retrieved profile for user: ${userDetails.email}`);

    res.json({
      success: true,
      data: {
        id: userDetails.id,
        email: userDetails.email,
        firstName: userDetails.first_name,
        lastName: userDetails.last_name,
        companyName: userDetails.company_name,
        emailVerified: userDetails.email_verified,
        createdAt: userDetails.created_at,
        lastLogin: userDetails.last_login
      }
    });
  } catch (error) {
    console.error('User profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to fetch user profile',
      details: error.message
    });
  }
});

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
    console.log(`✅ Profile updated for user: ${updatedUser.email}`);

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
router.get('/status', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 Getting user status for user:', req.user?.id);

    // Get user's profile information using REST API
    const userResult = await databaseOperations.getUserProfile(req.user.id);

    if (userResult.error || !userResult.data) {
      console.error('User status fetch error:', userResult.error);
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'User account not found'
      });
    }

    const userDetails = userResult.data;

    // Check if user has any connected services using REST API
    console.log('🔍 Checking connected services...');
    const servicesResult = await databaseOperations.getUserConnectedServices(req.user.id);
    const connectedServices = (servicesResult.data || []).map(cred => ({
      service: cred.service_name,
      connected_at: cred.created_at,
      expires_at: cred.expiry_date
    }));

    // Check OAuth connections (simplified for now)
    const oauthServices = [];
    console.log('🔍 OAuth services check - simplified implementation');
    // TODO: Implement OAuth services check with REST API

    console.log(`✅ Retrieved status for user: ${userDetails.email}`);

    res.json({
      success: true,
      data: {
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
      }
    });
  } catch (error) {
    console.error('User status error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to load user status',
      details: error.message
    });
  }
});

module.exports = router;
