import { authenticateToken } from '../_lib/auth.js';
import { getSupabaseAdmin } from '../_lib/database.js';

// POST /api/auth/logout
// Logout user and invalidate session
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed',
      message: 'Only POST requests are allowed'
    });
  }

  // Authenticate user (optional - logout should work even with invalid token)
  try {
    await authenticateToken(req, res, () => {});
  } catch (error) {
    // Continue with logout even if token is invalid
    console.log('Logout attempted with invalid/missing token');
  }

  try {
    // If user is authenticated, update last logout time
    if (req.user) {
      const supabase = getSupabaseAdmin();
      
      await supabase
        .from('users')
        .update({ 
          last_logout: new Date().toISOString() 
        })
        .eq('id', req.user.id);
    }

    // In a more sophisticated implementation, you might:
    // 1. Add the JWT token to a blacklist
    // 2. Clear any server-side sessions
    // 3. Revoke OAuth tokens if needed

    res.status(200).json({
      message: 'Logout successful',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Logout error:', error);
    
    // Even if there's an error, we should still return success
    // because the client-side token will be cleared
    res.status(200).json({
      message: 'Logout completed',
      note: 'Please clear your local authentication tokens'
    });
  }
}
