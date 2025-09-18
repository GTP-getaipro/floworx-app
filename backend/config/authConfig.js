/**
 * FloWorx Authentication Configuration
 * 
 * CRITICAL: This file centralizes all authentication-related configuration
 * to prevent token expiry mismatches and ensure consistency across the app.
 * 
 * ⚠️  GUARDRAIL: All token TTLs must be defined here and imported elsewhere.
 * ⚠️  DO NOT hardcode token expiry values in other files.
 */

const authConfig = {
  // Token Time-To-Live (TTL) Configuration
  tokens: {
    // Password reset token expiry (15 minutes as per requirements)
    passwordResetTTL: 15, // minutes
    
    // Email verification token expiry (24 hours)
    emailVerificationTTL: 24 * 60, // minutes (24 hours)
    
    // JWT access token expiry (1 hour)
    accessTokenTTL: 60, // minutes
    
    // JWT refresh token expiry (7 days)
    refreshTokenTTL: 7 * 24 * 60, // minutes (7 days)
    
    // Session cookie expiry (7 days)
    sessionCookieTTL: 7 * 24 * 60 * 60, // seconds (7 days)
  },

  // Password Requirements
  password: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    maxLength: 128,
  },

  // Rate Limiting Configuration
  rateLimits: {
    // General API requests (100 per 15 minutes per IP in production)
    api: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: process.env.NODE_ENV === 'production' ? 100 : 1000,
    },

    // Password reset requests (3 per 15 minutes per IP)
    passwordReset: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 3, // limit each IP to 3 requests per windowMs
    },

    // Login attempts (5 per 15 minutes per IP)
    login: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5,
    },

    // Registration attempts (3 per hour per IP)
    registration: {
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 3,
    },

    // OAuth callback attempts (10 per 15 minutes per IP in production)
    oauth: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: process.env.NODE_ENV === 'production' ? 10 : 50,
    },

    // Email verification resend (2 per 10 minutes per IP)
    emailVerification: {
      windowMs: 10 * 60 * 1000, // 10 minutes
      max: 2,
    },
  },

  // Email Service Configuration
  email: {
    // Required environment variables for email service
    requiredEnvVars: [
      'SENDGRID_API_KEY',
      'SENDGRID_FROM_EMAIL',
      'SENDGRID_FROM_NAME',
    ],
    
    // Email templates
    templates: {
      passwordReset: 'password-reset',
      emailVerification: 'email-verification',
      welcome: 'welcome',
    },
    
    // Email sending configuration
    retryAttempts: 3,
    retryDelay: 1000, // milliseconds
  },

  // Security Configuration
  security: {
    // JWT secret validation
    jwtSecretMinLength: 32,
    
    // Encryption key validation
    encryptionKeyLength: 32,
    
    // CORS origins (production)
    allowedOrigins: [
      'https://app.floworx-iq.com',
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
    ],
    
    // Cookie security settings
    cookieSettings: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      domain: process.env.NODE_ENV === 'production' ? '.floworx-iq.com' : undefined,
    },
  },

  // Database Configuration
  database: {
    // Connection pool settings
    pool: {
      min: 2,
      max: 10,
      acquireTimeoutMillis: 30000,
      idleTimeoutMillis: 30000,
    },
    
    // Query timeouts
    queryTimeout: 30000, // 30 seconds
    
    // Migration settings
    migrations: {
      directory: './db/migrations',
      tableName: 'knex_migrations',
    },
  },
};

/**
 * Validation function to ensure all required configuration is present
 * This runs at application startup to catch configuration issues early
 */
function validateAuthConfig() {
  const errors = [];

  // Validate token TTLs are positive numbers
  Object.entries(authConfig.tokens).forEach(([key, value]) => {
    if (typeof value !== 'number' || value <= 0) {
      errors.push(`Invalid token TTL for ${key}: must be a positive number`);
    }
  });

  // Validate required environment variables for email service
  authConfig.email.requiredEnvVars.forEach(envVar => {
    if (!process.env[envVar]) {
      errors.push(`Missing required environment variable: ${envVar}`);
    }
  });

  // Validate JWT secret
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < authConfig.security.jwtSecretMinLength) {
    errors.push(`JWT_SECRET must be at least ${authConfig.security.jwtSecretMinLength} characters long`);
  }

  // Validate encryption key
  if (!process.env.ENCRYPTION_KEY || process.env.ENCRYPTION_KEY.length !== authConfig.security.encryptionKeyLength) {
    errors.push(`ENCRYPTION_KEY must be exactly ${authConfig.security.encryptionKeyLength} characters long`);
  }

  // Validate database URL
  if (!process.env.DATABASE_URL && !process.env.SUPABASE_URL) {
    errors.push('Either DATABASE_URL or SUPABASE_URL must be provided');
  }

  if (errors.length > 0) {
    console.error('❌ Authentication Configuration Validation Failed:');
    errors.forEach(error => console.error(`   - ${error}`));
    throw new Error(`Authentication configuration validation failed: ${errors.join(', ')}`);
  }

  console.log('✅ Authentication configuration validation passed');
  return true;
}

/**
 * Get token TTL in milliseconds
 * @param {string} tokenType - Type of token (passwordResetTTL, emailVerificationTTL, etc.)
 * @returns {number} TTL in milliseconds
 */
function getTokenTTLMs(tokenType) {
  const ttlMinutes = authConfig.tokens[tokenType];
  if (!ttlMinutes) {
    throw new Error(`Unknown token type: ${tokenType}`);
  }
  return ttlMinutes * 60 * 1000;
}

/**
 * Get token TTL in seconds
 * @param {string} tokenType - Type of token
 * @returns {number} TTL in seconds
 */
function getTokenTTLSeconds(tokenType) {
  const ttlMinutes = authConfig.tokens[tokenType];
  if (!ttlMinutes) {
    throw new Error(`Unknown token type: ${tokenType}`);
  }
  return ttlMinutes * 60;
}

/**
 * Check if email service is properly configured
 * @returns {boolean} True if email service can be used
 */
function isEmailServiceConfigured() {
  return authConfig.email.requiredEnvVars.every(envVar => !!process.env[envVar]);
}

module.exports = {
  authConfig,
  validateAuthConfig,
  getTokenTTLMs,
  getTokenTTLSeconds,
  isEmailServiceConfigured,
};
