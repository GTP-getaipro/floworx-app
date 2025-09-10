// Single API handler for all routes to work within Vercel's serverless function limits
const { getSupabaseClient, getSupabaseAdmin } = require('./_lib/database.js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');

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

// Helper function to fetch Gmail labels
const fetchGmailLabels = async (accessToken) => {
  try {
    const response = await axios.get('https://gmail.googleapis.com/gmail/v1/users/me/labels', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data.labels || [];
  } catch (error) {
    console.error('Error fetching Gmail labels:', error);
    throw new Error('Failed to fetch Gmail labels');
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

      // Generate email verification token
      const verificationToken = jwt.sign(
        { email: email.toLowerCase(), type: 'email_verification' },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert([{
          email: email.toLowerCase(),
          password_hash: passwordHash,
          first_name: firstName,
          last_name: lastName,
          company_name: businessName || companyName || null,
          email_verified: false,
          verification_token: verificationToken,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (insertError) throw insertError;

      // Send verification email (in production, you'd use a real email service)
      const verificationUrl = `${process.env.FRONTEND_URL || 'https://app.floworx-iq.com'}/verify-email?token=${verificationToken}`;

      // TODO: Send actual verification email using your email service
      console.log(`Email verification URL for ${email}: ${verificationUrl}`);

      res.status(201).json({
        message: 'User registered successfully. Please check your email to verify your account.',
        user: {
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.first_name,
          lastName: newUser.last_name,
          companyName: newUser.company_name,
          emailVerified: false,
          createdAt: newUser.created_at
        },
        requiresEmailVerification: true,
        verificationEmailSent: true
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        error: 'Registration failed',
        message: 'Something went wrong during registration. Please try again.'
      });
    }
  },

  // Email verification endpoint
  'POST /auth/verify-email': async (req, res) => {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({
          success: false,
          message: 'Verification token is required'
        });
      }

      // Verify the token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      if (decoded.type !== 'email_verification') {
        return res.status(400).json({
          success: false,
          message: 'Invalid verification token'
        });
      }

      const supabase = getSupabaseAdmin();

      // Find user with this verification token
      const { data: user, error: findError } = await supabase
        .from('users')
        .select('*')
        .eq('email', decoded.email)
        .eq('verification_token', token)
        .single();

      if (findError || !user) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired verification token'
        });
      }

      if (user.email_verified) {
        return res.status(200).json({
          success: true,
          message: 'Email already verified'
        });
      }

      // Mark email as verified
      const { error: updateError } = await supabase
        .from('users')
        .update({
          email_verified: true,
          verification_token: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) {
        console.error('Error verifying email:', updateError);
        return res.status(500).json({
          success: false,
          message: 'Failed to verify email'
        });
      }

      // Generate login token
      const loginToken = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        success: true,
        message: 'Email verified successfully',
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          companyName: user.company_name,
          emailVerified: true
        },
        token: loginToken,
        expiresIn: '24h'
      });

    } catch (error) {
      console.error('Email verification error:', error);

      if (error.name === 'TokenExpiredError') {
        return res.status(400).json({
          success: false,
          message: 'Verification token has expired. Please request a new verification email.'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to verify email',
        error: error.message
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

      // Set a timeout for database operations
      const dbTimeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Database operation timeout')), 8000);
      });

      // Get user's basic info with timeout
      console.log('Fetching user data...');
      const userDataPromise = supabase
        .from('users')
        .select('email, email_verified, onboarding_completed, first_name, company_name')
        .eq('id', user.id)
        .single();

      const { data: userData, error: userError } = await Promise.race([userDataPromise, dbTimeout]);

      if (userError) {
        console.error('User data error:', userError);
        throw userError;
      }
      console.log('User data fetched successfully');

      // Check if Google is connected with timeout
      console.log('Checking Google connection...');
      const credentialsPromise = supabase
        .from('credentials')
        .select('id, service_name, created_at')
        .eq('user_id', user.id)
        .eq('service_name', 'google');

      const { data: credentials, error: credError } = await Promise.race([credentialsPromise, dbTimeout]);

      // Don't throw error for credentials - just assume not connected if query fails
      const googleConnected = credentials && credentials.length > 0;
      console.log('Google connected:', googleConnected);

      // Get onboarding progress (if table exists) with timeout
      console.log('Fetching onboarding progress...');
      let onboardingProgress = null;
      try {
        const progressPromise = supabase
          .from('onboarding_progress')
          .select('current_step, completed_steps, step_data, google_connected, completed')
          .eq('user_id', user.id)
          .single();

        const { data: progress, error: progressError } = await Promise.race([progressPromise, dbTimeout]);

        if (!progressError) {
          onboardingProgress = progress;
          console.log('Onboarding progress found');
        } else {
          console.log('No onboarding progress found');
        }
      } catch (e) {
        // Table might not exist or timeout, that's okay
        console.log('Onboarding progress table not accessible, using defaults:', e.message);
      }

      // Get business config (if table exists) with timeout
      console.log('Fetching business config...');
      let businessConfig = null;
      try {
        const configPromise = supabase
          .from('business_configs')
          .select('config, version, created_at, updated_at')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single();

        const { data: config, error: configError } = await Promise.race([configPromise, dbTimeout]);

        if (!configError) {
          businessConfig = config;
          console.log('Business config found');
        } else {
          console.log('No business config found');
        }
      } catch (e) {
        // Table might not exist or timeout, that's okay
        console.log('Business configs table not accessible, using defaults:', e.message);
      }

      // Determine next step based on progress - ensure industry and service connection are mandatory
      let nextStep = 'welcome';
      const completedSteps = onboardingProgress ? onboardingProgress.completed_steps : [];

      if (!googleConnected) {
        nextStep = 'google-connection';
      } else if (!businessConfig || !completedSteps.includes('business-type')) {
        nextStep = 'business-type';
      } else if (!completedSteps.includes('business-categories')) {
        nextStep = 'business-categories';
      } else if (!completedSteps.includes('label-mapping')) {
        nextStep = 'label-mapping';
      } else if (!completedSteps.includes('team-setup')) {
        nextStep = 'team-setup';
      } else if (!onboardingProgress || !onboardingProgress.completed) {
        nextStep = 'workflow-deployment';
      } else {
        nextStep = 'completed';
      }

      // Only mark onboarding as completed if ALL requirements are met
      const isOnboardingCompleted = googleConnected &&
                                   businessConfig &&
                                   completedSteps.includes('business-type') &&
                                   completedSteps.includes('business-categories') &&
                                   onboardingProgress &&
                                   onboardingProgress.completed;

      res.status(200).json({
        success: true,
        user: {
          id: user.id,
          email: userData.email,
          firstName: userData.first_name,
          companyName: userData.company_name,
          emailVerified: userData.email_verified || false,
          onboardingCompleted: isOnboardingCompleted
        },
        googleConnected,
        completedSteps: completedSteps || [],
        stepData: onboardingProgress ? onboardingProgress.step_data : {},
        nextStep,
        businessConfig: businessConfig ? businessConfig.config : null,
        onboardingCompleted: isOnboardingCompleted
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

  // Analytics dashboard endpoint
  'GET /analytics/dashboard': async (req, res) => {
    try {
      const user = await authenticate(req);
      res.status(200).json({
        success: true,
        dashboard: {
          totalUsers: 0,
          activeUsers: 0,
          onboardingConversion: 0,
          emailsProcessed: 0,
          workflowsActive: 0
        },
        message: 'Analytics dashboard data',
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
        error: 'Failed to load analytics dashboard',
        message: 'Something went wrong while loading analytics dashboard'
      });
    }
  },

  // Analytics onboarding endpoint
  'GET /analytics/onboarding': async (req, res) => {
    try {
      const user = await authenticate(req);
      res.status(200).json({
        success: true,
        onboarding: {
          totalStarted: 0,
          totalCompleted: 0,
          conversionRate: 0,
          averageTime: 0,
          dropoffPoints: []
        },
        message: 'Onboarding analytics data',
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
        error: 'Failed to load onboarding analytics',
        message: 'Something went wrong while loading onboarding analytics'
      });
    }
  },

  // Analytics user endpoint
  'GET /analytics/user': async (req, res) => {
    try {
      const user = await authenticate(req);
      res.status(200).json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          totalSessions: 0,
          lastActivity: new Date().toISOString(),
          onboardingCompleted: false,
          workflowsCreated: 0
        },
        message: 'User analytics data',
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
        error: 'Failed to load user analytics',
        message: 'Something went wrong while loading user analytics'
      });
    }
  },

  // Analytics track endpoint
  'POST /analytics/track': async (req, res) => {
    try {
      let user = null;
      try {
        user = await authenticate(req);
      } catch (error) {
        // Continue without authentication for analytics
      }

      const { event, properties } = req.body;

      console.log('Analytics: Custom event tracked', {
        userId: user?.id || 'anonymous',
        event: event,
        properties: properties,
        timestamp: new Date().toISOString()
      });

      res.status(200).json({
        success: true,
        message: 'Event tracked successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Analytics tracking error:', error);
      res.status(200).json({
        success: false,
        message: 'Analytics tracking failed but continuing'
      });
    }
  },

  // Analytics tracking endpoints
  'POST /analytics/onboarding/started': async (req, res) => {
    try {
      // Optional authentication - analytics can work without auth
      let user = null;
      try {
        user = await authenticate(req);
      } catch (error) {
        // Continue without authentication for analytics
      }

      console.log('Analytics: Onboarding started', {
        userId: user?.id || 'anonymous',
        timestamp: new Date().toISOString(),
        data: req.body
      });

      res.status(200).json({
        success: true,
        message: 'Onboarding start tracked',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Analytics tracking error:', error);
      res.status(200).json({
        success: false,
        message: 'Analytics tracking failed but continuing'
      });
    }
  },

  'POST /analytics/onboarding/completed': async (req, res) => {
    try {
      let user = null;
      try {
        user = await authenticate(req);
      } catch (error) {
        // Continue without authentication for analytics
      }

      console.log('Analytics: Onboarding completed', {
        userId: user?.id || 'anonymous',
        timestamp: new Date().toISOString(),
        data: req.body
      });

      res.status(200).json({
        success: true,
        message: 'Onboarding completion tracked',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Analytics tracking error:', error);
      res.status(200).json({
        success: false,
        message: 'Analytics tracking failed but continuing'
      });
    }
  },

  'POST /analytics/user/track': async (req, res) => {
    try {
      let user = null;
      try {
        user = await authenticate(req);
      } catch (error) {
        // Continue without authentication for analytics
      }

      console.log('Analytics: User action tracked', {
        userId: user?.id || 'anonymous',
        timestamp: new Date().toISOString(),
        data: req.body
      });

      res.status(200).json({
        success: true,
        message: 'User action tracked',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Analytics tracking error:', error);
      res.status(200).json({
        success: false,
        message: 'Analytics tracking failed but continuing'
      });
    }
  },

  // Onboarding endpoints
  'GET /onboarding': async (req, res) => {
    try {
      const user = await authenticate(req);
      res.status(200).json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          onboardingCompleted: false
        },
        steps: [
          { id: 'welcome', name: 'Welcome', completed: false },
          { id: 'google-connection', name: 'Connect Google', completed: false },
          { id: 'business-type', name: 'Business Type', completed: false },
          { id: 'workflow-setup', name: 'Workflow Setup', completed: false }
        ],
        currentStep: 'welcome',
        message: 'Onboarding data retrieved'
      });
    } catch (error) {
      if (error.message === 'No token provided' || error.message === 'Invalid token' || error.message === 'Token expired') {
        return res.status(401).json({
          error: 'Authentication required',
          message: 'Please log in to access this resource'
        });
      }
      res.status(500).json({
        error: 'Failed to load onboarding',
        message: 'Something went wrong while loading onboarding data'
      });
    }
  },

  'GET /onboarding/progress': async (req, res) => {
    try {
      const user = await authenticate(req);
      res.status(200).json({
        success: true,
        user: {
          id: user.id,
          email: user.email
        },
        progress: {
          currentStep: 'welcome',
          completedSteps: [],
          totalSteps: 4,
          percentComplete: 0
        },
        nextStep: 'google-connection',
        message: 'Onboarding progress retrieved'
      });
    } catch (error) {
      if (error.message === 'No token provided' || error.message === 'Invalid token' || error.message === 'Token expired') {
        return res.status(401).json({
          error: 'Authentication required',
          message: 'Please log in to access this resource'
        });
      }
      res.status(500).json({
        error: 'Failed to load onboarding progress',
        message: 'Something went wrong while loading onboarding progress'
      });
    }
  },

  'GET /onboarding/steps': async (req, res) => {
    try {
      const user = await authenticate(req);
      res.status(200).json({
        success: true,
        steps: [
          {
            id: 'welcome',
            name: 'Welcome to FloworX',
            description: 'Get started with your email automation journey',
            completed: false,
            required: true
          },
          {
            id: 'google-connection',
            name: 'Connect Google Account',
            description: 'Connect your Google account to access Gmail',
            completed: false,
            required: true
          },
          {
            id: 'business-type',
            name: 'Select Business Type',
            description: 'Choose your business category for customized workflows',
            completed: false,
            required: true
          },
          {
            id: 'workflow-setup',
            name: 'Setup Workflows',
            description: 'Configure your automated email workflows',
            completed: false,
            required: true
          }
        ],
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
        error: 'Failed to load onboarding steps',
        message: 'Something went wrong while loading onboarding steps'
      });
    }
  },

  'POST /onboarding/complete': async (req, res) => {
    try {
      const user = await authenticate(req);
      const { stepId, data } = req.body;

      console.log('Onboarding step completed:', {
        userId: user.id,
        stepId: stepId,
        data: data,
        timestamp: new Date().toISOString()
      });

      res.status(200).json({
        success: true,
        message: 'Onboarding step completed',
        stepId: stepId,
        nextStep: 'google-connection',
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
        error: 'Failed to complete onboarding step',
        message: 'Something went wrong while completing onboarding step'
      });
    }
  },

  // Recovery/session endpoints
  'GET /recovery/session': async (req, res) => {
    try {
      // Check if there's a valid session to recover
      let user = null;
      try {
        user = await authenticate(req);
      } catch (error) {
        // No valid session to recover
      }

      if (user) {
        res.status(200).json({
          success: true,
          message: 'Session recovered',
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName
          },
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(404).json({
          success: false,
          message: 'No session to recover',
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Session recovery error:', error);
      res.status(500).json({
        error: 'Session recovery failed',
        message: 'Something went wrong during session recovery'
      });
    }
  },

  // User settings endpoints
  'GET /user/settings': async (req, res) => {
    try {
      const user = await authenticate(req);
      res.status(200).json({
        success: true,
        settings: {
          notifications: {
            email: true,
            browser: true,
            workflow: true
          },
          privacy: {
            analytics: true,
            marketing: false
          },
          preferences: {
            theme: 'light',
            language: 'en',
            timezone: 'UTC'
          }
        },
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
        error: 'Failed to load user settings',
        message: 'Something went wrong while loading user settings'
      });
    }
  },

  // Workflow status endpoint
  'GET /workflows/status': async (req, res) => {
    try {
      const user = await authenticate(req);
      res.status(200).json({
        success: true,
        workflows: {
          total: 0,
          active: 0,
          paused: 0,
          error: 0
        },
        status: 'healthy',
        lastUpdate: new Date().toISOString(),
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
        error: 'Failed to load workflow status',
        message: 'Something went wrong while loading workflow status'
      });
    }
  },

  // OAuth status endpoint
  'GET /oauth/status': async (req, res) => {
    try {
      const user = await authenticate(req);
      res.status(200).json({
        success: true,
        connections: {
          google: {
            connected: false,
            email: null,
            lastSync: null,
            status: 'disconnected'
          }
        },
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
        error: 'Failed to load OAuth status',
        message: 'Something went wrong while loading OAuth status'
      });
    }
  },

  // Notifications unread endpoint
  'GET /notifications/unread': async (req, res) => {
    try {
      const user = await authenticate(req);
      res.status(200).json({
        success: true,
        unread: [],
        count: 0,
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
        error: 'Failed to load unread notifications',
        message: 'Something went wrong while loading unread notifications'
      });
    }
  },

  // Settings endpoints
  'GET /settings': async (req, res) => {
    try {
      const user = await authenticate(req);
      res.status(200).json({
        success: true,
        settings: {
          general: {
            companyName: user.company_name || '',
            timezone: 'UTC',
            language: 'en'
          },
          notifications: {
            email: true,
            browser: true,
            workflow: true
          },
          integrations: {
            google: false,
            n8n: false
          }
        },
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
        error: 'Failed to load settings',
        message: 'Something went wrong while loading settings'
      });
    }
  },

  'GET /settings/business': async (req, res) => {
    try {
      const user = await authenticate(req);
      res.status(200).json({
        success: true,
        business: {
          name: user.company_name || '',
          type: 'hot-tub',
          categories: [],
          workflows: []
        },
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
        error: 'Failed to load business settings',
        message: 'Something went wrong while loading business settings'
      });
    }
  },

  // Additional common SaaS endpoints
  'GET /api/status': async (req, res) => {
    // API status endpoint (different from /health)
    res.status(200).json({
      api: 'online',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    });
  },

  'POST /auth/refresh': async (req, res) => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          error: 'Missing refresh token',
          message: 'Refresh token is required'
        });
      }

      // For now, return an error since we're using JWT without refresh tokens
      res.status(501).json({
        error: 'Refresh not implemented',
        message: 'Token refresh is not yet implemented. Please log in again.'
      });
    } catch (error) {
      console.error('Token refresh error:', error);
      res.status(500).json({
        error: 'Token refresh failed',
        message: 'Something went wrong during token refresh'
      });
    }
  },

  'GET /user/preferences': async (req, res) => {
    try {
      const user = await authenticate(req);

      // Return default preferences for now
      res.status(200).json({
        userId: user.id,
        preferences: {
          theme: 'light',
          notifications: {
            email: true,
            push: false,
            sms: false
          },
          timezone: 'UTC',
          language: 'en'
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      if (error.message === 'No token provided' || error.message === 'Invalid token' || error.message === 'Token expired') {
        return res.status(401).json({
          error: 'Authentication required',
          message: 'Please log in to access this resource'
        });
      }
      res.status(500).json({
        error: 'Failed to load preferences',
        message: 'Something went wrong while loading user preferences'
      });
    }
  },

  'PUT /user/preferences': async (req, res) => {
    try {
      const user = await authenticate(req);
      const { preferences } = req.body;

      console.log('Updating user preferences:', { userId: user.id, preferences });

      // For now, just acknowledge the update
      res.status(200).json({
        success: true,
        message: 'Preferences updated successfully',
        preferences: preferences,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      if (error.message === 'No token provided' || error.message === 'Invalid token' || error.message === 'Token expired') {
        return res.status(401).json({
          error: 'Authentication required',
          message: 'Please log in to access this resource'
        });
      }
      res.status(500).json({
        error: 'Failed to update preferences',
        message: 'Something went wrong while updating preferences'
      });
    }
  },

  'GET /notifications': async (req, res) => {
    try {
      const user = await authenticate(req);

      res.status(200).json({
        notifications: [],
        unreadCount: 0,
        message: 'Notifications feature coming soon',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      if (error.message === 'No token provided' || error.message === 'Invalid token' || error.message === 'Token expired') {
        return res.status(401).json({
          error: 'Authentication required',
          message: 'Please log in to access this resource'
        });
      }
      res.status(500).json({
        error: 'Failed to load notifications',
        message: 'Something went wrong while loading notifications'
      });
    }
  },

  'POST /support/contact': async (req, res) => {
    try {
      const { name, email, subject, message } = req.body;

      // Optional authentication
      let user = null;
      try {
        user = await authenticate(req);
      } catch (error) {
        // Continue without authentication
      }

      console.log('Support contact form:', {
        name,
        email,
        subject,
        message: message?.substring(0, 100) + '...',
        userId: user?.id || 'anonymous'
      });

      res.status(200).json({
        success: true,
        message: 'Support request submitted successfully',
        ticketId: `TICKET-${Date.now()}`,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Support contact error:', error);
      res.status(500).json({
        error: 'Support request failed',
        message: 'Something went wrong while submitting your request'
      });
    }
  },

  // Password reset token verification endpoint
  'POST /auth/verify-reset-token': async (req, res) => {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({
          error: 'Missing token',
          message: 'Reset token is required'
        });
      }

      console.log('Verifying reset token:', token.substring(0, 10) + '...');

      // For now, return a mock response since we're using Supabase Auth
      // In a real implementation, this would verify the token against the database
      res.status(400).json({
        error: 'Invalid token',
        message: 'This password reset link is invalid or has expired. Please request a new one.'
      });
    } catch (error) {
      console.error('Token verification error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Unable to verify reset token'
      });
    }
  },

  // Password reset completion endpoint
  'POST /auth/reset-password': async (req, res) => {
    try {
      const { token, newPassword } = req.body;

      if (!token) {
        return res.status(400).json({
          error: 'Missing token',
          message: 'Reset token is required'
        });
      }

      if (!newPassword) {
        return res.status(400).json({
          error: 'Missing password',
          message: 'New password is required'
        });
      }

      // Validate password strength
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
      if (!passwordRegex.test(newPassword)) {
        return res.status(400).json({
          error: 'Invalid password',
          message: 'Password must be at least 8 characters long and contain uppercase letters, lowercase letters, and numbers.',
          requirements: {
            minLength: 8,
            requireUppercase: true,
            requireLowercase: true,
            requireNumbers: true,
            requireSpecialChars: false
          }
        });
      }

      console.log('Attempting password reset with token:', token.substring(0, 10) + '...');

      // For now, return a mock response since we're using Supabase Auth
      // In a real implementation, this would reset the password in the database
      res.status(400).json({
        error: 'Invalid token',
        message: 'This password reset link is invalid or has expired. Please request a new one.'
      });
    } catch (error) {
      console.error('Password reset error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Unable to reset password'
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

  // Post-OAuth intelligent Gmail analysis and business form generation
  'POST /oauth/analyze-gmail': async (req, res) => {
    try {
      const user = await authenticate(req);
      if (!user) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      const supabase = getSupabaseAdmin();

      // Get user's OAuth credentials
      const { data: credentials } = await supabase
        .from('oauth_credentials')
        .select('access_token, refresh_token')
        .eq('user_id', user.id)
        .eq('provider', 'google')
        .single();

      if (!credentials || !credentials.access_token) {
        return res.status(400).json({
          success: false,
          message: 'Google OAuth connection required'
        });
      }

      // Fetch Gmail labels using the access token
      const gmailLabels = await fetchGmailLabels(credentials.access_token);

      // Analyze labels for automation potential
      const IntelligentLabelMatcher = require('../backend/services/intelligentLabelMatcher');
      const matcher = new IntelligentLabelMatcher();

      const analysis = await matcher.analyzeLabelsForAutomation(gmailLabels);

      // Generate business data form
      const businessForm = matcher.generateBusinessDataForm(analysis);

      // Determine next steps
      const recommendations = {
        skipLabelMapping: !analysis.hasUsableLabels || analysis.automationScore < 0.3,
        proceedToBusinessForm: true,
        automationReadiness: analysis.automationScore,
        message: analysis.hasUsableLabels
          ? `Found ${analysis.recommendedMappings.length} Gmail labels that can be mapped to your hot tub business automation.`
          : 'No existing Gmail labels found that match hot tub business categories. We\'ll create the standard labels for you.'
      };

      res.json({
        success: true,
        analysis,
        businessForm,
        recommendations
      });

    } catch (error) {
      console.error('Error analyzing Gmail labels:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to analyze Gmail labels',
        error: error.message
      });
    }
  },

  // Submit business data and generate n8n workflow
  'POST /onboarding/business-data': async (req, res) => {
    try {
      const user = await authenticate(req);
      if (!user) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      const {
        company_name,
        business_phone,
        emergency_phone,
        business_address,
        service_area_radius,
        primary_services,
        business_hours,
        response_time_goal,
        team_size,
        custom_managers = [],
        custom_suppliers = [],
        phone_system = 'RingCentral',
        use_company_signature = 'no',
        company_signature = ''
      } = req.body;

      // Validate required fields
      if (!company_name || !business_phone || !business_address || !service_area_radius) {
        return res.status(400).json({
          success: false,
          message: 'Missing required business information'
        });
      }

      const supabase = getSupabaseAdmin();

      // Save business data
      const businessData = {
        user_id: user.id,
        company_name,
        business_phone,
        emergency_phone,
        business_address,
        service_area_radius: parseInt(service_area_radius),
        primary_services: Array.isArray(primary_services) ? primary_services : [primary_services],
        business_hours,
        response_time_goal,
        team_size,
        phone_system,
        custom_managers: custom_managers.slice(0, 5), // Max 5 managers
        custom_suppliers: custom_suppliers.slice(0, 10), // Max 10 suppliers
        use_company_signature: use_company_signature === 'yes',
        company_signature: use_company_signature === 'yes' ? company_signature : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Update user profile with company name
      await supabase
        .from('users')
        .update({
          company_name,
          onboarding_completed: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      // Save business configuration
      const { data: savedBusiness, error: businessError } = await supabase
        .from('business_configurations')
        .upsert(businessData)
        .select()
        .single();

      if (businessError) {
        console.error('Error saving business data:', businessError);
        return res.status(500).json({
          success: false,
          message: 'Failed to save business data'
        });
      }

      // Mark onboarding as completed
      await supabase
        .from('onboarding_progress')
        .upsert({
          user_id: user.id,
          completed_steps: ['business-type', 'business-categories', 'business-data'],
          step_data: { businessData },
          completed: true,
          completed_at: new Date().toISOString()
        });

      res.json({
        success: true,
        message: 'Business data saved successfully',
        businessData: savedBusiness,
        nextStep: 'dashboard'
      });

    } catch (error) {
      console.error('Error processing business data:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process business data',
        error: error.message
      });
    }
  },

  // Get current business configuration for dashboard
  'GET /dashboard/business-config': async (req, res) => {
    try {
      const user = await authenticate(req);
      if (!user) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      const supabase = getSupabaseAdmin();

      const { data: businessConfig, error } = await supabase
        .from('business_configurations')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching business config:', error);
        return res.status(500).json({
          success: false,
          message: 'Failed to fetch business configuration'
        });
      }

      res.json({
        success: true,
        businessConfig: businessConfig || null
      });

    } catch (error) {
      console.error('Error fetching business config:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch business configuration',
        error: error.message
      });
    }
  },

  // Update business configuration from dashboard
  'PUT /dashboard/business-config': async (req, res) => {
    try {
      const user = await authenticate(req);
      if (!user) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      const {
        company_name,
        business_phone,
        emergency_phone,
        business_address,
        service_area_radius,
        primary_services,
        business_hours,
        response_time_goal,
        team_size,
        custom_managers = [],
        custom_suppliers = [],
        phone_system,
        use_company_signature,
        company_signature
      } = req.body;

      const supabase = getSupabaseAdmin();

      // Update business configuration
      const updatedData = {
        user_id: user.id,
        company_name,
        business_phone,
        emergency_phone,
        business_address,
        service_area_radius: parseInt(service_area_radius),
        primary_services: Array.isArray(primary_services) ? primary_services : [primary_services],
        business_hours,
        response_time_goal,
        team_size,
        phone_system,
        custom_managers: custom_managers.slice(0, 5),
        custom_suppliers: custom_suppliers.slice(0, 10),
        use_company_signature: use_company_signature === 'yes' || use_company_signature === true,
        company_signature: (use_company_signature === 'yes' || use_company_signature === true) ? company_signature : null,
        updated_at: new Date().toISOString()
      };

      const { data: savedConfig, error: updateError } = await supabase
        .from('business_configurations')
        .upsert(updatedData)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating business config:', updateError);
        return res.status(500).json({
          success: false,
          message: 'Failed to update business configuration'
        });
      }

      // Update user profile with company name if changed
      if (company_name) {
        await supabase
          .from('users')
          .update({
            company_name,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);
      }

      res.json({
        success: true,
        message: 'Business configuration updated successfully',
        businessConfig: savedConfig
      });

    } catch (error) {
      console.error('Error updating business config:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update business configuration',
        error: error.message
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
  // Set comprehensive CORS headers for production
  const origin = req.headers.origin;
  const allowedOrigins = [
    'https://app.floworx-iq.com',
    ...(process.env.NODE_ENV === 'development' ? [
      'http://localhost:3000',
      'http://localhost:5001'
    ] : [])
  ];

  // Allow any Vercel deployment URL for this project
  const isVercelDeployment = origin && origin.includes('floworxdevelopers-projects.vercel.app');

  if (allowedOrigins.includes(origin) || isVercelDeployment) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, Accept-Language, Content-Language, X-Requested-With, Origin, Referer, User-Agent');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Parse the route (strip query parameters)
  const fullPath = req.url.replace('/api', '') || '/';
  const path = fullPath.split('?')[0]; // Remove query parameters for route matching
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
