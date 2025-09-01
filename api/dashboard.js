import { authenticateToken } from './_lib/auth.js';
import { getSupabaseAdmin } from './_lib/database.js';

// GET /api/dashboard
// Get dashboard data for authenticated user
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

  // Authenticate user
  try {
    await authenticateToken(req, res, () => {});
  } catch (error) {
    return; // authenticateToken already sent the response
  }

  try {
    const supabase = getSupabaseAdmin();

    // Get user information
    const { data: user, error: userError } = await supabase
      .from('users')
      .select(`
        id, 
        email, 
        first_name, 
        last_name, 
        company_name, 
        created_at, 
        last_login
      `)
      .eq('id', req.user.id)
      .single();

    if (userError || !user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User account not found'
      });
    }

    // Get OAuth connections
    const { data: oauthConnections, error: oauthError } = await supabase
      .from('oauth_connections')
      .select('provider, connected_at, status, last_sync')
      .eq('user_id', user.id);

    // Get credentials/services
    const { data: credentials, error: credentialsError } = await supabase
      .from('credentials')
      .select('service_name, created_at, expiry_date, status')
      .eq('user_id', user.id);

    // Get user statistics
    const { data: stats, error: statsError } = await supabase
      .from('user_stats')
      .select('emails_processed, workflows_active, last_activity, total_automations')
      .eq('user_id', user.id)
      .single();

    // Get recent activities
    const { data: activities, error: activitiesError } = await supabase
      .from('user_activities')
      .select('activity_type, description, created_at, metadata')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    // Format connections data
    const connections = {};
    if (oauthConnections && !oauthError) {
      oauthConnections.forEach(conn => {
        connections[conn.provider] = {
          connected: conn.status === 'active',
          connectedAt: conn.connected_at,
          lastSync: conn.last_sync,
          status: conn.status
        };
      });
    }

    // Add credentials to connections
    if (credentials && !credentialsError) {
      credentials.forEach(cred => {
        if (!connections[cred.service_name]) {
          connections[cred.service_name] = {
            connected: cred.status === 'active',
            connectedAt: cred.created_at,
            expiresAt: cred.expiry_date,
            status: cred.status
          };
        }
      });
    }

    // Prepare dashboard data
    const dashboardData = {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        companyName: user.company_name,
        createdAt: user.created_at,
        lastLogin: user.last_login
      },
      stats: {
        emailsProcessed: stats?.emails_processed || 0,
        workflowsActive: stats?.workflows_active || 0,
        totalAutomations: stats?.total_automations || 0,
        lastActivity: stats?.last_activity || user.last_login
      },
      connections: {
        google: connections.google || { 
          connected: false, 
          status: 'not_connected' 
        },
        ...connections
      },
      recentActivities: activities || [],
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
    console.error('Dashboard error:', error);
    
    res.status(500).json({
      error: 'Failed to load dashboard',
      message: 'Something went wrong while loading dashboard data'
    });
  }
}
