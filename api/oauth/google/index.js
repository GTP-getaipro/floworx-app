// GET /api/oauth/google
// Initiate Google OAuth flow - NO AUTHENTICATION REQUIRED
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed',
      message: 'Only GET requests are allowed'
    });
  }

  try {
    // Check required environment variables
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;

    if (!clientId || !redirectUri) {
      console.error('Missing OAuth configuration:', {
        hasClientId: !!clientId,
        hasRedirectUri: !!redirectUri
      });
      
      return res.status(500).json({
        error: 'OAuth configuration error',
        message: 'OAuth service is not properly configured'
      });
    }

    // Generate state parameter for security
    const state = Math.random().toString(36).substring(2, 15) + 
                  Math.random().toString(36).substring(2, 15);

    // Google OAuth 2.0 authorization URL
    const scopes = [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.modify'
    ].join(' ');

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', scopes);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');

    console.log('OAuth initiation:', {
      clientId: clientId.substring(0, 20) + '...',
      redirectUri,
      state
    });

    // Redirect to Google OAuth
    res.redirect(302, authUrl.toString());

  } catch (error) {
    console.error('OAuth initiation error:', error);
    
    res.status(500).json({
      error: 'OAuth initiation failed',
      message: 'Unable to start OAuth flow. Please try again.'
    });
  }
}
