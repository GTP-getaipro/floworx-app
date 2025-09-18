import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
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

    if (existingUser) {
      return res.status(409).json({
        error: 'User already exists',
        message: 'An account with this email already exists'
      });
    }

    // Hash the password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Generate verification token
    const crypto = require('crypto');
    const jwt = require('jsonwebtoken');

    // Create secure verification token
    const randomBytes = crypto.randomBytes(32).toString('hex');
    const userId = crypto.randomUUID();

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

    // Create new user with verification fields
    const { data: newUser, error: insertError } = await supabase
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

    if (insertError) {
      throw insertError;
    }

    // Send verification email (simplified for API route)
    const verificationUrl = `https://app.floworx-iq.com/verify-email?token=${encodeURIComponent(verificationToken)}`;

    // TODO: Implement email sending here
    console.log('Verification URL:', verificationUrl);

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
    res.status(500).json({
      error: 'Registration failed',
      message: 'Something went wrong during registration. Please try again.'
    });
  }
}
