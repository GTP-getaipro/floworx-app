const { authenticateToken } = require('../_lib/auth');

// GET /api/auth/verify
// Verify if current JWT token is valid
module.exports = (req, res) => {
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
  authenticateToken(req, res, () => {
    res.json({
      message: 'Token is valid',
      user: req.user
    });
  });
};
