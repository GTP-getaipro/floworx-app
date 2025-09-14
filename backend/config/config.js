/**
 * Centralized Configuration Management for FloworxInvite
 * Standardizes environment variable loading, validation, and access
 */

const path = require('path');
const dotenv = require('dotenv');
const { logger } = require('../utils/logger');

class ConfigManager {
  constructor() {
    this.config = {};
    this.isLoaded = false;
    this.validationErrors = [];
    this.validationWarnings = [];
    
    // Load environment variables
    this.loadEnvironment();
    
    // Validate configuration
    this.validateConfiguration();
    
    // Mark as loaded
    this.isLoaded = true;
  }

  /**
   * Load environment variables from multiple sources
   */
  loadEnvironment() {
    // Define possible .env file locations in order of preference
    const envPaths = [
      path.resolve(__dirname, '../../.env'), // Root .env file
      path.resolve(__dirname, '../.env'), // Backend .env file
      path.resolve(process.cwd(), '.env'), // Current working directory
      path.resolve(__dirname, '../../.env.production'), // Production env file
      path.resolve(__dirname, '../../.env.local') // Local env file
    ];

    let envLoaded = false;
    let loadedFrom = null;

    // Try to load from .env files
    for (const envPath of envPaths) {
      try {
        const result = dotenv.config({ path: envPath });
        if (!result.error) {
          envLoaded = true;
          loadedFrom = envPath;
          break;
        }
      } catch (error) {
        // Continue to next path
        continue;
      }
    }

    // Log environment loading result (only in development)
    if (process.env.NODE_ENV !== 'production') {
      if (envLoaded) {
        logger.info(`Environment loaded from: ${loadedFrom}`);
      } else {
        logger.warn('No .env file found, using system environment variables only');
      }
    }

    // Build configuration object
    this.buildConfiguration();
  }

  /**
   * Build configuration object from environment variables
   */
  buildConfiguration() {
    this.config = {
      // Environment
      nodeEnv: process.env.NODE_ENV || 'development',
      port: parseInt(process.env.PORT) || 5001,
      
      // Database Configuration
      database: {
        url: process.env.DATABASE_URL,
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT) || 5432,
        name: process.env.DB_NAME || 'postgres',
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        ssl: process.env.NODE_ENV === 'production'
      },

      // Supabase Configuration
      supabase: {
        url: process.env.SUPABASE_URL,
        anonKey: process.env.SUPABASE_ANON_KEY,
        serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY
      },

      // Authentication & Security
      auth: {
        jwtSecret: process.env.JWT_SECRET,
        encryptionKey: process.env.ENCRYPTION_KEY,
        tokenExpiry: process.env.JWT_EXPIRY || '24h'
      },

      // Google OAuth
      oauth: {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          redirectUri: process.env.GOOGLE_REDIRECT_URI
        }
      },

      // Redis Configuration
      redis: {
        url: process.env.REDIS_URL,
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD,
        disabled: process.env.DISABLE_REDIS === 'true'
      },

      // Email Configuration
      email: {
        smtp: {
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT) || 587,
          user: process.env.SMTP_USER,
          password: process.env.SMTP_PASS,
          secure: process.env.SMTP_SECURE === 'true'
        },
        from: {
          email: process.env.FROM_EMAIL,
          name: process.env.FROM_NAME || 'FloworxInvite'
        }
      },

      // n8n Configuration
      n8n: {
        apiKey: process.env.N8N_API_KEY,
        baseUrl: process.env.N8N_BASE_URL,
        enabled: process.env.N8N_ENABLED !== 'false'
      },

      // Application Configuration
      app: {
        frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
        logLevel: process.env.LOG_LEVEL || 'info',
        maxRequestSize: process.env.MAX_REQUEST_SIZE || '10mb',
        compressionLevel: parseInt(process.env.COMPRESSION_LEVEL) || 6
      },

      // Rate Limiting
      rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
      },

      // Performance & Monitoring
      performance: {
        cacheTtl: parseInt(process.env.CACHE_TTL) || 300,
        enableMetrics: process.env.ENABLE_METRICS !== 'false',
        enableTracing: process.env.ENABLE_TRACING === 'true'
      },

      // Deployment Configuration
      deployment: {
        platform: process.env.DEPLOYMENT_PLATFORM || 'unknown',
        buildEnv: process.env.BUILD_ENV || 'development',
        healthCheckPath: process.env.HEALTH_CHECK_PATH || '/api/health',
        version: process.env.APP_VERSION || '1.0.0'
      }
    };
  }

  /**
   * Validate configuration and collect errors/warnings
   */
  validateConfiguration() {
    this.validationErrors = [];
    this.validationWarnings = [];

    // Required variables for all environments
    const requiredVars = [
      { key: 'auth.jwtSecret', path: 'JWT_SECRET', validator: (val) => val && val.length >= 32 },
      { key: 'auth.encryptionKey', path: 'ENCRYPTION_KEY', validator: (val) => val && val.length === 32 }
    ];

    // Production-specific required variables
    if (this.config.nodeEnv === 'production') {
      requiredVars.push(
        { key: 'database.url', path: 'DATABASE_URL', validator: (val) => val && val.startsWith('postgresql://') },
        { key: 'supabase.url', path: 'SUPABASE_URL', validator: (val) => val && val.startsWith('https://') },
        { key: 'supabase.anonKey', path: 'SUPABASE_ANON_KEY', validator: (val) => val && val.length > 50 },
        { key: 'oauth.google.clientId', path: 'GOOGLE_CLIENT_ID', validator: (val) => val && val.length > 20 },
        { key: 'oauth.google.clientSecret', path: 'GOOGLE_CLIENT_SECRET', validator: (val) => val && val.length > 20 }
      );
    }

    // Validate required variables
    for (const { key, path, validator } of requiredVars) {
      const value = this.getNestedValue(key);
      if (!validator(value)) {
        this.validationErrors.push(`Missing or invalid required environment variable: ${path}`);
      }
    }

    // Optional variables with warnings
    const optionalVars = [
      { key: 'email.smtp.host', path: 'SMTP_HOST', message: 'Email functionality will be disabled' },
      { key: 'redis.url', path: 'REDIS_URL', message: 'Caching will be disabled' },
      { key: 'n8n.apiKey', path: 'N8N_API_KEY', message: 'Workflow automation will be disabled' }
    ];

    for (const { key, path, message } of optionalVars) {
      const value = this.getNestedValue(key);
      if (!value) {
        this.validationWarnings.push(`Optional environment variable not set: ${path} - ${message}`);
      }
    }

    // Log validation results (only in development or if errors exist)
    if (this.config.nodeEnv !== 'production' || this.validationErrors.length > 0) {
      this.logValidationResults();
    }

    // Throw error if critical validation fails
    if (this.validationErrors.length > 0) {
      throw new Error(`Configuration validation failed:\n${this.validationErrors.join('\n')}`);
    }
  }

  /**
   * Get nested configuration value
   */
  getNestedValue(path) {
    return path.split('.').reduce((obj, key) => obj && obj[key], this.config);
  }

  /**
   * Log validation results
   */
  logValidationResults() {
    if (this.validationErrors.length > 0) {
      logger.error('Configuration validation errors:');
      this.validationErrors.forEach(error => logger.error(`  - ${error}`));
    }

    if (this.validationWarnings.length > 0) {
      logger.warn('Configuration validation warnings:');
      this.validationWarnings.forEach(warning => logger.warn(`  - ${warning}`));
    }

    if (this.validationErrors.length === 0 && this.validationWarnings.length === 0) {
      logger.info('Configuration validation passed successfully');
    }
  }

  /**
   * Get configuration value
   */
  get(path, defaultValue = undefined) {
    if (!this.isLoaded) {
      throw new Error('Configuration not loaded yet');
    }

    const value = this.getNestedValue(path);
    return value !== undefined ? value : defaultValue;
  }

  /**
   * Check if configuration is valid
   */
  isValid() {
    return this.validationErrors.length === 0;
  }

  /**
   * Get all validation errors
   */
  getValidationErrors() {
    return [...this.validationErrors];
  }

  /**
   * Get all validation warnings
   */
  getValidationWarnings() {
    return [...this.validationWarnings];
  }

  /**
   * Get environment-safe configuration for logging
   */
  getSafeConfig() {
    const safeConfig = JSON.parse(JSON.stringify(this.config));
    
    // Redact sensitive information
    const sensitiveKeys = ['password', 'secret', 'key', 'token'];
    
    const redactSensitive = (obj, path = '') => {
      for (const [key, value] of Object.entries(obj)) {
        const currentPath = path ? `${path}.${key}` : key;
        
        if (typeof value === 'object' && value !== null) {
          redactSensitive(value, currentPath);
        } else if (typeof value === 'string' && sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
          obj[key] = value ? `[REDACTED - ${value.length} chars]` : '[NOT SET]';
        }
      }
    };

    redactSensitive(safeConfig);
    return safeConfig;
  }
}

// Create singleton instance
const configManager = new ConfigManager();

module.exports = configManager;
