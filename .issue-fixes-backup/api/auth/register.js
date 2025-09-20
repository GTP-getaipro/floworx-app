import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { getSupabaseAdmin } from '../_lib/database.js';

// Input validation helpers
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePassword = (password) => {
  return password && password.length >= 8;
};

// POST /api/auth/register
// Register a new user account
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

  try {
    console.log('Registration request received:', { body: req.body });
    const { firstName, lastName, companyName, email, password } = req.body;

    // Input validation
    if (!email || !password) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Email and password are required'
      });
    }

    if (!firstName || !lastName) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'First name and last name are required'
      });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({
        error: 'Invalid email',
        message: 'Please provide a valid email address'
      });
    }

    if (!validatePassword(password)) {
      return res.status(400).json({
        error: 'Invalid password',
        message: 'Password must be at least 8 characters long'
      });
    }

    // Get Supabase admin client
    const supabase = getSupabaseAdmin();

    // Check if user already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    // Handle the case where no user is found (this is expected for new registrations)
    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Database error checking existing user:', checkError);
      return res.status(500).json({
        error: {
          code: 'DATABASE_ERROR',
          message: 'Unable to check user existence'
        }
      });
    }

    if (existingUser) {
      return res.status(409).json({
        error: {
          code: 'EMAIL_EXISTS',
          message: 'An account with this email already exists'
        }
      });
    }

    // Hash the password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Generate verification token
    const randomBytes = crypto.randomBytes(32).toString('hex');
    const userId = crypto.randomUUID();

    // Check if JWT_SECRET is available
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET environment variable is not set');
      return res.status(500).json({
        error: {
          code: 'CONFIGURATION_ERROR',
          message: 'Server configuration error'
        }
      });
    }

    const tokenPayload = {
      type: 'email_verification',
      email: email.toLowerCase().trim(),
      userId: userId,
      randomBytes: randomBytes,
      iat: Math.floor(Date.now() / 1000)
    };

    const verificationToken = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET,
      {
        expiresIn: '24h',
        issuer: 'floworx-email-verification',
        audience: 'floworx-users'
      }
    );

    const expiresAt = new Date(Date.now() + (24 * 60 * 60 * 1000));

    // First, try to create user with verification fields
    // If that fails due to missing columns, create without them
    let newUser;
    let insertError;

    try {
      const result = await supabase
        .from('users')
        .insert([{
          id: userId,
          email: email.toLowerCase(),
          password_hash: passwordHash,
          first_name: firstName,
          last_name: lastName,
          company_name: companyName || null,
          email_verified: false,
          verification_token: verificationToken,
          verification_token_expires_at: expiresAt.toISOString(),
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      newUser = result.data;
      insertError = result.error;
    } catch (error) {
      // If verification columns don't exist, try without them
      if (error.message && error.message.includes('column') &&
          (error.message.includes('verification_token') || error.message.includes('verification_token_expires_at'))) {

        console.log('Verification columns not found, creating user without them');
        const fallbackResult = await supabase
          .from('users')
          .insert([{
            id: userId,
            email: email.toLowerCase(),
            password_hash: passwordHash,
            first_name: firstName,
            last_name: lastName,
            company_name: companyName || null,
            email_verified: false,
            created_at: new Date().toISOString()
          }])
          .select()
          .single();

        newUser = fallbackResult.data;
        insertError = fallbackResult.error;
      } else {
        insertError = error;
      }
    }

    if (insertError) {
      console.error('User creation error:', insertError);
      return res.status(500).json({
        error: {
          code: 'USER_CREATION_FAILED',
          message: 'Failed to create user account'
        }
      });
    }

    // Send verification email (simplified for API route)
    const verificationUrl = `https://app.floworx-iq.com/verify-email?token=${encodeURIComponent(verificationToken)}`;

    // TODO: Implement email sending here
    console.log('Verification URL:', verificationUrl);
    console.log('User created successfully:', { userId: newUser.id, email: email.toLowerCase() });

    res.status(201).json({
      success: true,
      message: "Account created successfully. Please check your email to verify your account.",
      userId: newUser.id,
      requiresVerification: true,
      email: email.toLowerCase().trim(),
      emailSent: false // Set to true when email service is implemented
    });

  } catch (error) {
    console.error('Registration error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      stack: error.stack
    });

    // Return appropriate error response
    if (error.code === '23505') { // Unique constraint violation
      return res.status(409).json({
        error: {
          code: 'EMAIL_EXISTS',
          message: 'An account with this email already exists'
        }
      });
    }

    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred during registration'
      }
    });
  }
}
