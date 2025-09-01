import { getSupabaseAdmin } from '../../_lib/database.js';

// POST /api/oauth/google/callback
// Handle Google OAuth callback
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed',
      message: 'Only GET and POST requests are allowed'
    });
  }

  try {
    // Get parameters from query string (GET) or body (POST)
    const { code, state, error: oauthError } = req.method === 'GET' ? req.query : req.body;

    // Check for OAuth errors
    if (oauthError) {
      console.error('OAuth error from Google:', oauthError);
      
      return res.status(400).json({
        error: 'OAuth authorization failed',
        message: 'Google OAuth authorization was denied or failed'
      });
    }

    // Validate required parameters
    if (!code) {
      return res.status(400).json({
        error: 'Missing authorization code',
        message: 'OAuth callback missing required authorization code'
      });
    }

    // Check environment variables
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      console.error('Missing OAuth configuration for callback');
      
      return res.status(500).json({
        error: 'OAuth configuration error',
        message: 'OAuth service is not properly configured'
      });
    }

    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Token exchange failed:', errorData);
      
      return res.status(400).json({
        error: 'Token exchange failed',
        message: 'Failed to exchange authorization code for access token'
      });
    }

    const tokenData = await tokenResponse.json();

    // Get user info from Google
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    if (!userInfoResponse.ok) {
      console.error('Failed to get user info from Google');
      
      return res.status(400).json({
        error: 'User info retrieval failed',
        message: 'Failed to get user information from Google'
      });
    }

    const userInfo = await userInfoResponse.json();

    // Store OAuth connection in database
    const supabase = getSupabaseAdmin();
    
    // For now, we'll return success without storing in database
    // In a real implementation, you'd want to:
    // 1. Find or create user based on email
    // 2. Store OAuth tokens securely
    // 3. Create OAuth connection record

    console.log('OAuth callback successful:', {
      email: userInfo.email,
      name: userInfo.name,
      hasAccessToken: !!tokenData.access_token,
      hasRefreshToken: !!tokenData.refresh_token
    });

    // For development, return success with user info
    res.status(200).json({
      message: 'OAuth connection successful',
      user: {
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture
      },
      // Don't return actual tokens in response for security
      tokenReceived: !!tokenData.access_token,
      refreshTokenReceived: !!tokenData.refresh_token
    });

  } catch (error) {
    console.error('OAuth callback error:', error);
    
    res.status(500).json({
      error: 'OAuth callback failed',
      message: 'Something went wrong during OAuth callback processing'
    });
  }
}
