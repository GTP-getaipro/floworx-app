const { authenticateToken } = require('../_lib/auth');
const { getPool } = require('../_lib/database');

// GET /api/user/status
// Get user's connection status for dashboard
module.exports = async (req, res) => {
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
      // Check if user has any connected services
      const pool = getPool();
      const credentialsQuery = `
        SELECT service_name, created_at, expiry_date 
        FROM credentials 
        WHERE user_id = $1
      `;
      const credentials = await pool.query(credentialsQuery, [req.user.id]);

      const connectedServices = credentials.rows.map(cred => ({
        service: cred.service_name,
        connected_at: cred.created_at,
        expires_at: cred.expiry_date
      }));

      res.json({
        user: req.user,
        connected_services: connectedServices,
        has_google_connection: connectedServices.some(service => service.service === 'google')
      });

    } catch (error) {
      console.error('User status error:', error);
      res.status(500).json({
        error: 'Status check failed',
        message: 'Internal server error while checking user status'
      });
    }
  });
};
