// Single API handler for all routes to work within Vercel's serverless function limits
import { getSupabaseClient, getSupabaseAdmin } from './_lib/database.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Simple authentication helper for single API handler
const authenticate = async (req) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No token provided');
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Verify user still exists in database
    const supabase = getSupabaseAdmin();
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, first_name, last_name')
      .eq('id', decoded.userId)
      .single();

    if (userError || !user) {
      throw new Error('User no longer exists');
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name
    };
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    } else {
      throw error;
    }
  }
};

// Route handlers
const routes = {
  // Health endpoint
  'GET /health': async (req, res) => {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.from('users').select('count').limit(1);
      const databaseConnected = !error || error.message.includes('row-level security');

      res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: { connected: databaseConnected, provider: 'Supabase' },
        environment: process.env.NODE_ENV || 'development',
        version: '1.0.0'
      });
    } catch (error) {
      console.error('Health check failed:', error);
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        database: { connected: false, provider: 'Supabase', error: 'Database connection failed' },
        environment: process.env.NODE_ENV || 'development',
        version: '1.0.0'
      });
    }
  },

  // Auth endpoints
  'POST /auth/register': async (req, res) => {
    try {
      const { firstName, lastName, companyName, email, password } = req.body;

      if (!email || !password || !firstName || !lastName) {
        return res.status(400).json({
          error: 'Missing required fields',
          message: 'Email, password, first name, and last name are required'
        });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          error: 'Invalid email',
          message: 'Please provide a valid email address'
        });
      }

      if (password.length < 8) {
        return res.status(400).json({
          error: 'Invalid password',
          message: 'Password must be at least 8 characters long'
        });
      }

      const supabase = getSupabaseAdmin();
      const { data: existingUser } = await supabase
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

      const passwordHash = await bcrypt.hash(password, 12);
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert([{
          email: email.toLowerCase(),
          password_hash: passwordHash,
          first_name: firstName,
          last_name: lastName,
          company_name: companyName || null,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (insertError) throw insertError;

      const token = jwt.sign(
        { userId: newUser.id, email: newUser.email },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.status(201).json({
        message: 'User registered successfully',
        user: {
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.first_name,
          lastName: newUser.last_name,
          companyName: newUser.company_name,
          createdAt: newUser.created_at
        },
        token,
        expiresIn: '24h'
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        error: 'Registration failed',
        message: 'Something went wrong during registration. Please try again.'
      });
    }
  },

  'POST /auth/login': async (req, res) => {
    try {
      const { email, password, remember = false } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          error: 'Missing credentials',
          message: 'Email and password are required'
        });
      }

      const supabase = getSupabaseAdmin();
      const { data: user, error: findError } = await supabase
        .from('users')
        .select('id, email, password_hash, first_name, last_name, company_name, created_at')
        .eq('email', email.toLowerCase())
        .single();

      if (findError || !user) {
        return res.status(401).json({
          error: 'Invalid credentials',
          message: 'Email or password is incorrect'
        });
      }

      const passwordMatch = await bcrypt.compare(password, user.password_hash);
      if (!passwordMatch) {
        return res.status(401).json({
          error: 'Invalid credentials',
          message: 'Email or password is incorrect'
        });
      }

      const tokenExpiry = remember ? '7d' : '24h';
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: tokenExpiry }
      );

      await supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', user.id);

      res.status(200).json({
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          companyName: user.company_name,
          createdAt: user.created_at
        },
        token,
        expiresIn: tokenExpiry
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        error: 'Login failed',
        message: 'Something went wrong during login. Please try again.'
      });
    }
  },

  'POST /auth/logout': async (req, res) => {
    try {
      // Optional authentication for logout
      try {
        const user = await authenticate(req);
        if (user) {
          const supabase = getSupabaseAdmin();
          await supabase
            .from('users')
            .update({ last_logout: new Date().toISOString() })
            .eq('id', user.id);
        }
      } catch (error) {
        // Continue with logout even if token is invalid
      }

      res.status(200).json({
        message: 'Logout successful',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(200).json({
        message: 'Logout completed',
        note: 'Please clear your local authentication tokens'
      });
    }
  },

  // User endpoints
  'GET /user/status': async (req, res) => {
    try {
      const user = await authenticate(req);

      const supabase = getSupabaseAdmin();
      const { data: userDetails, error: userError } = await supabase
        .from('users')
        .select('id, email, first_name, last_name, company_name, created_at, last_login, email_verified')
        .eq('id', user.id)
        .single();

      if (userError) throw userError;

      const { data: credentials } = await supabase
        .from('credentials')
        .select('service_name, created_at, expiry_date')
        .eq('user_id', user.id);

      const { data: oauthConnections } = await supabase
        .from('oauth_connections')
        .select('provider, connected_at, status')
        .eq('user_id', user.id);

      const connectedServices = credentials ? credentials.map(cred => ({
        service: cred.service_name,
        connected_at: cred.created_at,
        expires_at: cred.expiry_date
      })) : [];

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
      if (error.message === 'No token provided' || error.message === 'Invalid token') {
        return res.status(401).json({
          error: 'Authentication required',
          message: 'Please log in to access this resource'
        });
      }
      res.status(500).json({
        error: 'Failed to load user status',
        message: 'Something went wrong while loading user information'
      });
    }
  },

  'GET /user/profile': async (req, res) => {
    try {
      const user = await authenticate(req);

      const supabase = getSupabaseAdmin();
      const { data: userProfile, error: userError } = await supabase
        .from('users')
        .select(`
          id,
          email,
          first_name,
          last_name,
          company_name,
          created_at,
          last_login,
          email_verified,
          profile_picture_url,
          timezone,
          notification_preferences
        `)
        .eq('id', user.id)
        .single();

      if (userError || !userProfile) {
        return res.status(404).json({
          error: 'User not found',
          message: 'User profile not found'
        });
      }

      res.status(200).json({
        id: userProfile.id,
        email: userProfile.email,
        firstName: userProfile.first_name,
        lastName: userProfile.last_name,
        companyName: userProfile.company_name,
        createdAt: userProfile.created_at,
        lastLogin: userProfile.last_login,
        emailVerified: userProfile.email_verified || false,
        profilePictureUrl: userProfile.profile_picture_url,
        timezone: userProfile.timezone,
        notificationPreferences: userProfile.notification_preferences || {}
      });
    } catch (error) {
      console.error('Get profile error:', error);
      if (error.message === 'No token provided' || error.message === 'Invalid token') {
        return res.status(401).json({
          error: 'Authentication required',
          message: 'Please log in to access this resource'
        });
      }
      res.status(500).json({
        error: 'Failed to load profile',
        message: 'Something went wrong while loading your profile'
      });
    }
  },

  'PUT /user/profile': async (req, res) => {
    try {
      const user = await authenticate(req);

      const { firstName, lastName, companyName, timezone, notificationPreferences } = req.body;
      const supabase = getSupabaseAdmin();

      const updates = {};
      if (firstName !== undefined) {
        if (!firstName.trim()) {
          return res.status(400).json({
            error: 'Invalid first name',
            message: 'First name cannot be empty'
          });
        }
        updates.first_name = firstName.trim();
      }

      if (lastName !== undefined) {
        if (!lastName.trim()) {
          return res.status(400).json({
            error: 'Invalid last name',
            message: 'Last name cannot be empty'
          });
        }
        updates.last_name = lastName.trim();
      }

      if (companyName !== undefined) {
        updates.company_name = companyName ? companyName.trim() : null;
      }

      if (timezone !== undefined) {
        updates.timezone = timezone;
      }

      if (notificationPreferences !== undefined) {
        updates.notification_preferences = notificationPreferences;
      }

      updates.updated_at = new Date().toISOString();

      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user.id)
        .select(`
          id,
          email,
          first_name,
          last_name,
          company_name,
          timezone,
          notification_preferences,
          updated_at
        `)
        .single();

      if (updateError) {
        throw updateError;
      }

      res.status(200).json({
        message: 'Profile updated successfully',
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          firstName: updatedUser.first_name,
          lastName: updatedUser.last_name,
          companyName: updatedUser.company_name,
          timezone: updatedUser.timezone,
          notificationPreferences: updatedUser.notification_preferences || {},
          updatedAt: updatedUser.updated_at
        }
      });
    } catch (error) {
      console.error('Update profile error:', error);
      if (error.message === 'No token provided' || error.message === 'Invalid token') {
        return res.status(401).json({
          error: 'Authentication required',
          message: 'Please log in to access this resource'
        });
      }
      res.status(500).json({
        error: 'Failed to update profile',
        message: 'Something went wrong while updating your profile'
      });
    }
  },

  // Dashboard endpoint
  'GET /dashboard': async (req, res) => {
    try {
      const user = await authenticate(req);

      const supabase = getSupabaseAdmin();
      const { data: userDetails, error: userError } = await supabase
        .from('users')
        .select('id, email, first_name, last_name, company_name, created_at, last_login')
        .eq('id', user.id)
        .single();

      if (userError || !userDetails) {
        return res.status(404).json({
          error: 'User not found',
          message: 'User account not found'
        });
      }

      const { data: oauthConnections } = await supabase
        .from('oauth_connections')
        .select('provider, connected_at, status, last_sync')
        .eq('user_id', userDetails.id);

      const connections = {};
      if (oauthConnections) {
        oauthConnections.forEach(conn => {
          connections[conn.provider] = {
            connected: conn.status === 'active',
            connectedAt: conn.connected_at,
            lastSync: conn.last_sync,
            status: conn.status
          };
        });
      }

      const dashboardData = {
        user: {
          id: userDetails.id,
          email: userDetails.email,
          firstName: userDetails.first_name,
          lastName: userDetails.last_name,
          companyName: userDetails.company_name,
          createdAt: userDetails.created_at,
          lastLogin: userDetails.last_login
        },
        stats: {
          emailsProcessed: 0,
          workflowsActive: 0,
          totalAutomations: 0,
          lastActivity: userDetails.last_login
        },
        connections: {
          google: connections.google || { connected: false, status: 'not_connected' },
          ...connections
        },
        recentActivities: [],
        quickActions: [
          {
            id: 'connect_google',
            title: 'Connect Google Account',
            description: 'Connect your Google account to start automating emails',
            action: '/api/oauth/google',
            enabled: !connections.google?.connected,
            priority: 1
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
      if (error.message === 'No token provided' || error.message === 'Invalid token') {
        return res.status(401).json({
          error: 'Authentication required',
          message: 'Please log in to access this resource'
        });
      }
      res.status(500).json({
        error: 'Failed to load dashboard',
        message: 'Something went wrong while loading dashboard data'
      });
    }
  },

  // OAuth endpoints
  'GET /oauth/google': async (req, res) => {
    try {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const redirectUri = process.env.GOOGLE_REDIRECT_URI;

      if (!clientId || !redirectUri) {
        return res.status(500).json({
          error: 'OAuth configuration error',
          message: 'OAuth service is not properly configured'
        });
      }

      const state = Math.random().toString(36).substring(2, 15) +
                    Math.random().toString(36).substring(2, 15);

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

      res.redirect(302, authUrl.toString());
    } catch (error) {
      console.error('OAuth initiation error:', error);
      res.status(500).json({
        error: 'OAuth initiation failed',
        message: 'Unable to start OAuth flow. Please try again.'
      });
    }
  },

  'GET /oauth/google/callback': async (req, res) => {
    try {
      const { code, state, error: oauthError } = req.query;

      if (oauthError) {
        return res.status(400).json({
          error: 'OAuth authorization failed',
          message: 'Google OAuth authorization was denied or failed'
        });
      }

      if (!code) {
        return res.status(400).json({
          error: 'Missing authorization code',
          message: 'OAuth callback missing required authorization code'
        });
      }

      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      const redirectUri = process.env.GOOGLE_REDIRECT_URI;

      if (!clientId || !clientSecret || !redirectUri) {
        return res.status(500).json({
          error: 'OAuth configuration error',
          message: 'OAuth service is not properly configured'
        });
      }

      // Exchange authorization code for access token
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code: code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
        }),
      });

      if (!tokenResponse.ok) {
        return res.status(400).json({
          error: 'Token exchange failed',
          message: 'Failed to exchange authorization code for access token'
        });
      }

      const tokenData = await tokenResponse.json();

      // Get user info from Google
      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });

      if (!userInfoResponse.ok) {
        return res.status(400).json({
          error: 'User info retrieval failed',
          message: 'Failed to get user information from Google'
        });
      }

      const userInfo = await userInfoResponse.json();

      res.status(200).json({
        message: 'OAuth connection successful',
        user: {
          email: userInfo.email,
          name: userInfo.name,
          picture: userInfo.picture
        },
        tokenReceived: !!tokenData.access_token,
        refreshTokenReceived: !!tokenData.refresh_token
      });
    } catch (error) {
      console.error('OAuth callback error:', error);
      res.status(500).json({
        error: 'OAuth callback failed',
        message: 'Something went wrong during OAuth callback processing'
      });
    }
  }
};

// Main handler
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Parse the route
  const path = req.url.replace('/api', '') || '/';
  const route = `${req.method} ${path}`;

  console.log(`API Request: ${route}`);

  // Find matching route
  const handler = routes[route];

  if (handler) {
    try {
      await handler(req, res);
    } catch (error) {
      console.error(`Error in ${route}:`, error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Something went wrong'
      });
    }
  } else {
    res.status(404).json({
      error: 'Not found',
      message: 'The requested endpoint does not exist'
    });
  }
}
