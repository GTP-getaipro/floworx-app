import { authenticateToken } from '../_lib/auth.js';
import { getSupabaseAdmin } from '../_lib/database.js';

// Input validation helpers
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// GET /api/user/profile - Get user profile
// PUT /api/user/profile - Update user profile
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!['GET', 'PUT'].includes(req.method)) {
    return res.status(405).json({
      error: 'Method not allowed',
      message: 'Only GET and PUT requests are allowed'
    });
  }

  // Authenticate user
  try {
    await authenticateToken(req, res, () => {});
  } catch (error) {
    return; // authenticateToken already sent the response
  }

  const supabase = getSupabaseAdmin();

  if (req.method === 'GET') {
    // GET - Return user profile
    try {
      const { data: user, error: userError } = await supabase
        .from('users')
        .select(`
          id, 
          email, 
          first_name, 
          last_name, 
          company_name, 
          created_at, 
          last_login,
          email_verified,
          profile_picture_url,
          timezone,
          notification_preferences
        `)
        .eq('id', req.user.id)
        .single();

      if (userError || !user) {
        return res.status(404).json({
          error: 'User not found',
          message: 'User profile not found'
        });
      }

      res.status(200).json({
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        companyName: user.company_name,
        createdAt: user.created_at,
        lastLogin: user.last_login,
        emailVerified: user.email_verified || false,
        profilePictureUrl: user.profile_picture_url,
        timezone: user.timezone,
        notificationPreferences: user.notification_preferences || {}
      });

    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        error: 'Failed to load profile',
        message: 'Something went wrong while loading your profile'
      });
    }

  } else if (req.method === 'PUT') {
    // PUT - Update user profile
    try {
      const { 
        firstName, 
        lastName, 
        companyName, 
        timezone, 
        notificationPreferences 
      } = req.body;

      // Validate input
      const updates = {};
      
      if (firstName !== undefined) {
        if (!firstName.trim()) {
          return res.status(400).json({
            error: 'Invalid first name',
            message: 'First name cannot be empty'
          });
        }
        updates.first_name = firstName.trim();
      }

      if (lastName !== undefined) {
        if (!lastName.trim()) {
          return res.status(400).json({
            error: 'Invalid last name',
            message: 'Last name cannot be empty'
          });
        }
        updates.last_name = lastName.trim();
      }

      if (companyName !== undefined) {
        updates.company_name = companyName ? companyName.trim() : null;
      }

      if (timezone !== undefined) {
        updates.timezone = timezone;
      }

      if (notificationPreferences !== undefined) {
        updates.notification_preferences = notificationPreferences;
      }

      // Add updated timestamp
      updates.updated_at = new Date().toISOString();

      // Update user profile
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update(updates)
        .eq('id', req.user.id)
        .select(`
          id, 
          email, 
          first_name, 
          last_name, 
          company_name, 
          timezone,
          notification_preferences,
          updated_at
        `)
        .single();

      if (updateError) {
        throw updateError;
      }

      res.status(200).json({
        message: 'Profile updated successfully',
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          firstName: updatedUser.first_name,
          lastName: updatedUser.last_name,
          companyName: updatedUser.company_name,
          timezone: updatedUser.timezone,
          notificationPreferences: updatedUser.notification_preferences || {},
          updatedAt: updatedUser.updated_at
        }
      });

    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({
        error: 'Failed to update profile',
        message: 'Something went wrong while updating your profile'
      });
    }
  }
}
