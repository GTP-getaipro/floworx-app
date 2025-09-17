const { verify } = require('../utils/jwt');

/**
 * Middleware to require authentication via JWT session cookie
 * Attaches req.auth = { userId } on success, otherwise returns 401
 */
function requireAuth(req, res, next) {
  try {
    // Get session cookie
    const token = req.cookies?.fx_sess;
    
    if (!token) {
      return res.status(401).json({
        error: { 
          code: "UNAUTHORIZED", 
          message: "Authentication required" 
        }
      });
    }
    
    // Verify JWT token
    const decoded = verify(token);
    
    // Attach user info to request
    req.auth = {
      userId: decoded.sub
    };
    
    next();
  } catch (error) {
    // JWT verification failed (expired, invalid, etc.)
    return res.status(401).json({
      error: { 
        code: "UNAUTHORIZED", 
        message: "Invalid or expired session" 
      }
    });
  }
}

module.exports = requireAuth;
