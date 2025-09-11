// Add this to backend/routes/auth.js

const crypto = require('crypto');

// POST /api/auth/forgot-password
router.post('/forgot-password', 
  validateRequest({ body: forgotPasswordSchema }),
  asyncWrapper(async (req, res) => {
    const { email } = req.body;
    
    try {
      // Find user by email
      const userQuery = 'SELECT id, email, first_name FROM users WHERE email = $1';
      const userResult = await query(userQuery, [email.toLowerCase()]);
      
      if (userResult.rows.length === 0) {
        return res.status(200).json({
          success: true,
          message: 'If an account with that email exists, a password reset link has been sent.'
        });
      }
      
      const user = userResult.rows[0];
      
      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      
      // Store reset token
      const storeTokenQuery = `
        INSERT INTO password_reset_tokens (user_id, token, expires_at)
        VALUES ($1, $2, $3)
        ON CONFLICT (user_id) 
        DO UPDATE SET token = $2, expires_at = $3, created_at = CURRENT_TIMESTAMP, used_at = NULL
      `;
      
      await query(storeTokenQuery, [user.id, resetToken, resetExpires]);
      
      // For development - log the reset URL
      const resetUrl = `${process.env.FRONTEND_URL || 'https://app.floworx-iq.com'}/reset-password?token=${resetToken}`;
      console.log(`Password reset URL for ${user.email}: ${resetUrl}`);
      
      res.status(200).json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.',
        resetUrl: process.env.NODE_ENV === 'development' ? resetUrl : undefined
      });
      
    } catch (error) {
      console.error('Password reset error:', error);
      res.status(500).json({
        success: false,
        error: {
          type: 'SERVER_ERROR',
          message: 'Failed to process password reset request',
          code: 500
        }
      });
    }
  })
);