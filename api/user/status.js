import { authenticateToken } from '../_lib/auth.js';
import { getSupabaseAdmin } from '../_lib/database.js';

// GET /api/user/status
// Get user's connection status for dashboard
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

  // Use the authentication middleware
  authenticateToken(req, res, async () => {
    try {
      // Get Supabase admin client
      const supabase = getSupabaseAdmin();

      // Get user's full information
      const { data: userDetails, error: userError } = await supabase
        .from('users')
        .select('id, email, first_name, last_name, company_name, created_at, last_login, email_verified')
        .eq('id', req.user.id)
        .single();

      if (userError) {
        throw userError;
      }

      // Check if user has any connected services
      const { data: credentials, error: credentialsError } = await supabase
        .from('credentials')
        .select('service_name, created_at, expiry_date')
        .eq('user_id', req.user.id);

      const connectedServices = credentials ? credentials.map(cred => ({
        service: cred.service_name,
        connected_at: cred.created_at,
        expires_at: cred.expiry_date
      })) : [];

      // Get OAuth connections
      const { data: oauthConnections, error: oauthError } = await supabase
        .from('oauth_connections')
        .select('provider, connected_at, status')
        .eq('user_id', req.user.id);

      const oauthServices = oauthConnections ? oauthConnections.map(conn => ({
        service: conn.provider,
        connected_at: conn.connected_at,
        status: conn.status
      })) : [];

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
}
