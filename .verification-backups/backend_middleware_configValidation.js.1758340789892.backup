/**
 * Configuration Validation Middleware
 * Validates environment configuration on application startup
 */

const config = require('../config/config');
const logger = require('../utils/logger');
const { ErrorResponse } = require('../utils/ErrorResponse');

/**
 * Middleware to validate configuration on startup
 */
const validateConfigurationOnStartup = (req, res, next) => {
  try {
    // Check if configuration is valid
    if (!config.isValid()) {
      const errors = config.getValidationErrors();
      logger.error('Configuration validation failed on startup:', errors);
      
      // In production, return a generic error
      if (config.get('nodeEnv') === 'production') {
        throw ErrorResponse.internalError('Service temporarily unavailable');
      } else {
        // In development, provide detailed error information
        throw ErrorResponse.internalError('Configuration validation failed', {
          errors: errors,
          warnings: config.getValidationWarnings()
        });
      }
    }

    next();
  } catch (error) {
    if (error instanceof ErrorResponse) {
      error.send(res, req);
    } else {
      const errorResponse = ErrorResponse.internalError('Configuration validation error');
      errorResponse.send(res, req);
    }
  }
};

/**
 * Middleware to check specific service availability
 */
const checkServiceAvailability = (serviceName) => {
  return (req, res, next) => {
    try {
      let isAvailable = true;
      let message = '';

      switch (serviceName) {
        case 'database':
          isAvailable = !!(config.get('database.url') || 
                          (config.get('database.host') && config.get('database.user')));
          message = 'Database connection not configured';
          break;

        case 'redis':
          isAvailable = !config.get('redis.disabled') && 
                       !!(config.get('redis.url') || config.get('redis.host'));
          message = 'Redis caching not available';
          break;

        case 'email':
          isAvailable = !!(config.get('email.smtp.host') && config.get('email.smtp.user'));
          message = 'Email service not configured';
          break;

        case 'oauth':
          isAvailable = !!(config.get('oauth.google.clientId') && 
                          config.get('oauth.google.clientSecret'));
          message = 'OAuth service not configured';
          break;

        case 'n8n':
          isAvailable = config.get('n8n.enabled') && 
                       !!(config.get('n8n.apiKey') && config.get('n8n.baseUrl'));
          message = 'n8n workflow service not available';
          break;

        default:
          logger.warn(`Unknown service check requested: ${serviceName}`);
          return next();
      }

      if (!isAvailable) {
        logger.warn(`Service unavailable: ${serviceName} - ${message}`);
        
        // Add service availability info to request
        req.serviceAvailability = req.serviceAvailability || {};
        req.serviceAvailability[serviceName] = false;
        
        // In production, continue with degraded functionality
        if (config.get('nodeEnv') === 'production') {
          return next();
        } else {
          // In development, provide detailed information
          throw ErrorResponse.serviceUnavailable(`${serviceName} service not available: ${message}`);
        }
      }

      // Mark service as available
      req.serviceAvailability = req.serviceAvailability || {};
      req.serviceAvailability[serviceName] = true;
      
      next();
    } catch (error) {
      if (error instanceof ErrorResponse) {
        error.send(res, req);
      } else {
        const errorResponse = ErrorResponse.serviceUnavailable(`${serviceName} service check failed`);
        errorResponse.send(res, req);
      }
    }
  };
};

/**
 * Middleware to add configuration info to request context
 */
const addConfigContext = (req, res, next) => {
  try {
    // Add safe configuration info to request
    req.config = {
      nodeEnv: config.get('nodeEnv'),
      version: config.get('deployment.version'),
      platform: config.get('deployment.platform'),
      features: {
        redis: !config.get('redis.disabled') && !!(config.get('redis.url') || config.get('redis.host')),
        email: !!(config.get('email.smtp.host') && config.get('email.smtp.user')),
        oauth: !!(config.get('oauth.google.clientId') && config.get('oauth.google.clientSecret')),
        n8n: config.get('n8n.enabled') && !!(config.get('n8n.apiKey') && config.get('n8n.baseUrl'))
      }
    };

    next();
  } catch (error) {
    logger.error('Failed to add config context:', error);
    next(); // Continue without config context
  }
};

/**
 * Health check endpoint that includes configuration status
 */
const configHealthCheck = (req, res) => {
  try {
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: config.get('nodeEnv'),
      version: config.get('deployment.version'),
      configuration: {
        valid: config.isValid(),
        errors: config.getValidationErrors().length,
        warnings: config.getValidationWarnings().length
      },
      services: {
        database: !!(config.get('database.url') || 
                    (config.get('database.host') && config.get('database.user'))),
        redis: !config.get('redis.disabled') && 
               !!(config.get('redis.url') || config.get('redis.host')),
        email: !!(config.get('email.smtp.host') && config.get('email.smtp.user')),
        oauth: !!(config.get('oauth.google.clientId') && config.get('oauth.google.clientSecret')),
        n8n: config.get('n8n.enabled') && 
             !!(config.get('n8n.apiKey') && config.get('n8n.baseUrl'))
      }
    };

    // If configuration is invalid, mark as unhealthy
    if (!config.isValid()) {
      healthStatus.status = 'unhealthy';
      healthStatus.issues = config.getValidationErrors();
    }

    // Add warnings if any
    if (config.getValidationWarnings().length > 0) {
      healthStatus.warnings = config.getValidationWarnings();
    }

    res.status(healthStatus.status === 'healthy' ? 200 : 503).json(healthStatus);
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    });
  }
};

/**
 * Development-only endpoint to view safe configuration
 */
const viewSafeConfig = (req, res) => {
  try {
    // Only allow in development
    if (config.get('nodeEnv') === 'production') {
      throw ErrorResponse.forbidden('Configuration viewing not allowed in production');
    }

    const safeConfig = config.getSafeConfig();
    
    res.json({
      success: true,
      data: {
        configuration: safeConfig,
        validation: {
          valid: config.isValid(),
          errors: config.getValidationErrors(),
          warnings: config.getValidationWarnings()
        },
        loadedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    if (error instanceof ErrorResponse) {
      error.send(res, req);
    } else {
      const errorResponse = ErrorResponse.internalError('Failed to retrieve configuration');
      errorResponse.send(res, req);
    }
  }
};

module.exports = {
  validateConfigurationOnStartup,
  checkServiceAvailability,
  addConfigContext,
  configHealthCheck,
  viewSafeConfig
};
