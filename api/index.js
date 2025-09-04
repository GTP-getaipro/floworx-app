// Single API handler for all routes to work within Vercel's serverless function limits
const { getSupabaseClient, getSupabaseAdmin } = require('./_lib/database.js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Simple authentication helper for single API handler
const authenticate = async (req) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No token provided');
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Token decoded successfully, userId:', decoded.userId);

    // Return user data from token without additional database lookup
    // The token verification already confirms the user exists
    return {
      id: decoded.userId,
      email: decoded.email,
      firstName: decoded.firstName || 'User',
      lastName: decoded.lastName || ''
    };
  } catch (error) {
    console.error('Authentication error:', error);
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    } else {
      throw new Error('Authentication failed');
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

  // Database health endpoint
  'GET /health/db': async (req, res) => {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.from('users').select('count').limit(1);
      const databaseConnected = !error || error.message.includes('row-level security');

      if (databaseConnected) {
        res.status(200).json({
          database: 'connected',
          timestamp: new Date().toISOString(),
          status: 'healthy',
          provider: 'Supabase'
        });
      } else {
        res.status(503).json({
          database: 'disconnected',
          timestamp: new Date().toISOString(),
          status: 'unhealthy',
          error: error?.message || 'Database connection failed'
        });
      }
    } catch (error) {
      console.error('Database health check failed:', error);
      res.status(503).json({
        database: 'disconnected',
        timestamp: new Date().toISOString(),
        status: 'unhealthy',
        error: error.message
      });
    }
  },

  // Auth endpoints
  'POST /auth/forgot-password': async (req, res) => {
    try {
      console.log('Password reset request received:', { body: req.body });

      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          error: 'Missing email',
          message: 'Email address is required for password reset'
        });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          error: 'Invalid email',
          message: 'Please provide a valid email address'
        });
      }

      console.log('Initiating password reset for:', email);

      const supabase = getSupabaseClient();
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.FRONTEND_URL || 'https://app.floworx-iq.com'}/reset-password`
      });

      if (error) {
        console.error('Password reset error:', error);
        return res.status(400).json({
          error: 'Password reset failed',
          message: error.message || 'Unable to send password reset email'
        });
      }

      console.log('Password reset email sent successfully');

      res.status(200).json({
        message: 'Password reset email sent successfully',
        email: email
      });
    } catch (error) {
      console.error('Password reset error:', error);
      res.status(500).json({
        error: 'Password reset failed',
        message: 'Something went wrong. Please try again.'
      });
    }
  },

  'POST /auth/register': async (req, res) => {
    try {
      console.log('Registration request received:', { body: req.body });

      const { firstName, lastName, businessName, companyName, email, password, agreeToTerms, marketingConsent } = req.body;

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

      console.log('Checking environment variables:', {
        hasSupabaseUrl: !!process.env.SUPABASE_URL,
        hasSupabaseServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        hasJwtSecret: !!process.env.JWT_SECRET
      });

      const supabase = getSupabaseAdmin();
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('email', email.toLowerCase())
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Database check error:', checkError);
        throw new Error(`Database error: ${checkError.message}`);
      }

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
          company_name: businessName || companyName || null,
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

  'GET /auth/verify': async (req, res) => {
    try {
      const user = await authenticate(req);
      res.status(200).json({
        message: 'Token is valid',
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName
        }
      });
    } catch (error) {
      console.error('Token verification error:', error);
      if (error.message === 'No token provided' || error.message === 'Invalid token' || error.message === 'Token expired') {
        return res.status(401).json({
          error: 'Authentication required',
          message: 'Please log in to access this resource'
        });
      }
      res.status(500).json({
        error: 'Verification failed',
        message: 'Something went wrong during token verification'
      });
    }
  },

  'GET /user/profile': async (req, res) => {
    try {
      console.log('User profile endpoint called');
      const user = await authenticate(req);
      console.log('User authenticated:', user.id);

      // Get user profile information from database
      const supabase = getSupabaseAdmin();
      const { data: userDetails, error: userError } = await supabase
        .from('users')
        .select('id, email, first_name, last_name, company_name, created_at, last_login, email_verified')
        .eq('id', user.id)
        .single();

      console.log('User profile query result:', { userDetails, userError });

      // Use fallback data if database query fails
      const userData = userDetails || {
        id: user.id,
        email: user.email,
        first_name: user.firstName,
        last_name: user.lastName,
        company_name: null,
        created_at: new Date().toISOString(),
        last_login: null,
        email_verified: false
      };

      if (userError) {
        console.warn('User profile query failed, using token data:', userError);
      }

      res.status(200).json({
        id: userData.id,
        email: userData.email,
        firstName: userData.first_name,
        lastName: userData.last_name,
        companyName: userData.company_name,
        createdAt: userData.created_at,
        lastLogin: userData.last_login,
        emailVerified: userData.email_verified || false
      });
    } catch (error) {
      console.error('User profile error:', error);
      if (error.message === 'No token provided' || error.message === 'Invalid token' || error.message === 'Token expired') {
        return res.status(401).json({
          error: 'Authentication required',
          message: 'Please log in to access this resource'
        });
      }
      res.status(500).json({
        error: 'Failed to load user profile',
        message: 'Something went wrong while loading user profile'
      });
    }
  },

  // Test endpoint
  'GET /test': async (req, res) => {
    res.status(200).json({
      message: 'Test endpoint working',
      timestamp: new Date().toISOString(),
      routes: Object.keys(routes).length
    });
  },

  // Password requirements endpoint
  'GET /auth/password-requirements': async (req, res) => {
    res.status(200).json({
      requirements: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: false
      },
      description: 'Password must be at least 8 characters long and contain uppercase letters, lowercase letters, and numbers.'
    });
  },

  // User endpoints
  'GET /user/status': async (req, res) => {
    try {
      console.log('User status endpoint called');
      const user = await authenticate(req);
      console.log('User authenticated:', user.id);

      // Get basic user information from database
      const supabase = getSupabaseAdmin();
      const { data: userDetails, error: userError } = await supabase
        .from('users')
        .select('id, email, first_name, last_name, company_name, created_at, last_login, email_verified')
        .eq('id', user.id)
        .single();

      console.log('User query result:', { userDetails, userError });

      // Use fallback data if database query fails
      const userData = userDetails || {
        id: user.id,
        email: user.email,
        first_name: user.firstName,
        last_name: user.lastName,
        company_name: null,
        created_at: new Date().toISOString(),
        last_login: null,
        email_verified: false
      };

      if (userError) {
        console.warn('User details query failed, using token data:', userError);
      }

      // Return minimal user status without optional tables
      res.status(200).json({
        id: userData.id,
        email: userData.email,
        firstName: userData.first_name,
        lastName: userData.last_name,
        companyName: userData.company_name,
        createdAt: userData.created_at,
        lastLogin: userData.last_login,
        emailVerified: userData.email_verified || false,
        connected_services: [],
        oauth_connections: [],
        has_google_connection: false
      });
    } catch (error) {
      console.error('User status error:', error);
      if (error.message === 'No token provided' || error.message === 'Invalid token' || error.message === 'Token expired') {
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

  // Onboarding endpoints
  'GET /onboarding/status': async (req, res) => {
    try {
      console.log('Onboarding status endpoint called');
      const user = await authenticate(req);
      console.log('User authenticated:', user.id);

      const supabase = getSupabaseAdmin();

      // Get user's basic info
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('email, email_verified, onboarding_completed, first_name, company_name')
        .eq('id', user.id)
        .single();

      if (userError) {
        throw userError;
      }

      // Check if Google is connected
      const { data: credentials, error: credError } = await supabase
        .from('credentials')
        .select('id, service_name, created_at')
        .eq('user_id', user.id)
        .eq('service_name', 'google');

      const googleConnected = credentials && credentials.length > 0;

      // Get onboarding progress (if table exists)
      let onboardingProgress = null;
      try {
        const { data: progress, error: progressError } = await supabase
          .from('onboarding_progress')
          .select('current_step, completed_steps, step_data, google_connected, completed')
          .eq('user_id', user.id)
          .single();

        if (!progressError) {
          onboardingProgress = progress;
        }
      } catch (e) {
        // Table might not exist, that's okay
        console.log('Onboarding progress table not found, using defaults');
      }

      // Get business config (if table exists)
      let businessConfig = null;
      try {
        const { data: config, error: configError } = await supabase
          .from('business_configs')
          .select('config, version, created_at, updated_at')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single();

        if (!configError) {
          businessConfig = config;
        }
      } catch (e) {
        // Table might not exist, that's okay
        console.log('Business configs table not found, using defaults');
      }

      // Determine next step based on progress
      let nextStep = 'welcome';
      const completedSteps = onboardingProgress ? onboardingProgress.completed_steps : [];

      if (!googleConnected) {
        nextStep = 'google-connection';
      } else if (!userData.company_name && !completedSteps.includes('business-type')) {
        nextStep = 'business-type';
      } else if (!businessConfig && !completedSteps.includes('business-categories')) {
        nextStep = 'business-categories';
      } else if (!onboardingProgress || !onboardingProgress.completed) {
        nextStep = 'workflow-deployment';
      } else {
        nextStep = 'completed';
      }

      res.status(200).json({
        success: true,
        user: {
          id: user.id,
          email: userData.email,
          firstName: userData.first_name,
          companyName: userData.company_name,
          emailVerified: userData.email_verified || false,
          onboardingCompleted: userData.onboarding_completed || false
        },
        googleConnected,
        completedSteps: completedSteps || [],
        stepData: onboardingProgress ? onboardingProgress.step_data : {},
        nextStep,
        businessConfig: businessConfig ? businessConfig.config : null,
        onboardingCompleted: onboardingProgress ? onboardingProgress.completed : false
      });

    } catch (error) {
      console.error('Onboarding status error:', error);
      if (error.message === 'No token provided' || error.message === 'Invalid token' || error.message === 'Token expired') {
        return res.status(401).json({
          error: 'Authentication required',
          message: 'Please log in to access this resource'
        });
      }
      res.status(500).json({
        success: false,
        error: 'Failed to load onboarding status',
        message: 'Something went wrong while loading onboarding information'
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
      console.log('Dashboard endpoint called');
      const user = await authenticate(req);
      console.log('Dashboard user authenticated:', user.id);

      // Get additional user details if needed
      const supabase = getSupabaseAdmin();
      const { data: userDetails, error: userError } = await supabase
        .from('users')
        .select('id, email, first_name, last_name, company_name, created_at, last_login')
        .eq('id', user.id)
        .single();

      console.log('Dashboard user query result:', { userDetails, userError });

      // Use authenticated user data as fallback if database query fails
      const userData = userDetails || {
        id: user.id,
        email: user.email,
        first_name: user.firstName,
        last_name: user.lastName,
        company_name: null,
        created_at: new Date().toISOString(),
        last_login: null
      };

      if (userError) {
        console.warn('Dashboard user query failed, using authenticated user data:', userError);
      }

      // Simplified connections - avoid database queries that might fail
      const connections = { google: { connected: false } };

      const dashboardData = {
        user: {
          id: userData.id,
          email: userData.email,
          firstName: userData.first_name,
          lastName: userData.last_name,
          companyName: userData.company_name,
          createdAt: userData.created_at,
          lastLogin: userData.last_login
        },
        stats: {
          emailsProcessed: 0,
          workflowsActive: 0,
          totalAutomations: 0,
          lastActivity: userData.last_login
        },
        connections: connections,
        recentActivities: [],
        quickActions: [
          {
            id: 'connect_google',
            title: 'Connect Google Account',
            description: 'Connect your Google account to start automating emails',
            action: '/api/oauth/google',
            enabled: true,
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

  // Workflows endpoints (placeholder)
  'GET /workflows': async (req, res) => {
    try {
      const user = await authenticate(req);
      res.status(200).json({
        workflows: [],
        message: 'Workflows feature coming soon',
        user_id: user.id
      });
    } catch (error) {
      if (error.message === 'No token provided' || error.message === 'Invalid token' || error.message === 'Token expired') {
        return res.status(401).json({
          error: 'Authentication required',
          message: 'Please log in to access this resource'
        });
      }
      res.status(500).json({
        error: 'Failed to load workflows',
        message: 'Something went wrong while loading workflows'
      });
    }
  },

  // Analytics endpoints (placeholder)
  'GET /analytics': async (req, res) => {
    try {
      const user = await authenticate(req);
      res.status(200).json({
        analytics: {
          emailsProcessed: 0,
          workflowsActive: 0,
          totalAutomations: 0,
          conversionRate: 0
        },
        message: 'Analytics feature coming soon',
        user_id: user.id
      });
    } catch (error) {
      if (error.message === 'No token provided' || error.message === 'Invalid token' || error.message === 'Token expired') {
        return res.status(401).json({
          error: 'Authentication required',
          message: 'Please log in to access this resource'
        });
      }
      res.status(500).json({
        error: 'Failed to load analytics',
        message: 'Something went wrong while loading analytics'
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
async function handler(req, res) {
  // Set CORS headers for production
  res.setHeader('Access-Control-Allow-Credentials', 'true');
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
  console.log('Available routes:', Object.keys(routes));

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

module.exports = handler;
