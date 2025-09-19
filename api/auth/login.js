import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getSupabaseAdmin } from '../_lib/database.js';

// Input validation helper
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// POST /api/auth/login
// Authenticate user and return JWT
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
    const remoteAddr = req.ip || req.connection?.remoteAddress || null;
    return res.status(405).json({
      success: false,
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: 'Only POST requests are allowed'
      },
      meta: { remoteAddr }
    });
  }

  try {
    const { email, password } = req.body;
    const remoteAddr = req.ip || req.connection?.remoteAddress || null;

    // Input validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Email and password are required'
        },
        meta: { remoteAddr }
      });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({
        error: 'Invalid email',
        message: 'Please provide a valid email address'
      });
    }

    // Find user by email
    const supabase = getSupabaseAdmin();
    const { data: user, error: findError } = await supabase
      .from('users')
      .select('id, email, password_hash, first_name, last_name, company_name, created_at')
      .eq('email', email.toLowerCase())
      .single();

    if (findError || !user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password'
        },
        meta: { remoteAddr }
      });
    }

    // Compare password with hash
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password'
        },
        meta: { remoteAddr }
      });
    }

    // Check if user is verified
    if (!user.email_verified) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'EMAIL_NOT_VERIFIED',
          message: 'Please verify your email address to log in. Check your inbox for the verification link.'
        },
        meta: {
          remoteAddr,
          resendUrl: '/api/auth/resend',
          userFriendlyMessage: 'Your account is not verified. Please check your email for the verification link.'
        }
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Update last login timestamp
    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id);

    res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        businessName: user.company_name,
        emailVerified: user.email_verified
      },
      meta: {
        remoteAddr,
        token,
        expiresIn: '24h',
        loginTime: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    const remoteAddr = req.ip || req.connection?.remoteAddress || null;
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Something went wrong during login. Please try again.'
      },
      meta: { remoteAddr }
    });
  }
}
