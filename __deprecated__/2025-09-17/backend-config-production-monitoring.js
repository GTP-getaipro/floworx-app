/**
 * Production Monitoring Configuration
 * Comprehensive monitoring setup for FloWorx production environment
 */

const productionMonitoringConfig = {
  // Environment-specific settings
  environment: {
    name: process.env.NODE_ENV || 'production',
    version: process.env.APP_VERSION || '1.0.0',
    deployment: process.env.DEPLOYMENT_ID || 'unknown',
    region: process.env.AWS_REGION || 'us-east-1'
  },

  // Real-time monitoring configuration
  monitoring: {
    enabled: true,
    
    // Performance thresholds for FloWorx SaaS
    thresholds: {
      // Database query performance
      slowQuery: parseInt(process.env.MONITOR_SLOW_QUERY_MS, 10) || 500,
      criticalQuery: parseInt(process.env.MONITOR_CRITICAL_QUERY_MS, 10) || 2000,

      // API response times
      slowEndpoint: parseInt(process.env.MONITOR_SLOW_ENDPOINT_MS, 10) || 1000,
      criticalEndpoint: parseInt(process.env.MONITOR_CRITICAL_ENDPOINT_MS, 10) || 3000,
      
      // System resources
      highMemoryUsage: parseFloat(process.env.MONITOR_HIGH_MEMORY) || 0.85,
      highCpuUsage: parseFloat(process.env.MONITOR_HIGH_CPU) || 0.80,
      
      // Database connections
      highConnectionCount: parseInt(process.env.MONITOR_HIGH_CONNECTIONS, 10) || 15,
      criticalConnectionCount: parseInt(process.env.MONITOR_CRITICAL_CONNECTIONS, 10) || 25,
      
      // Error rates
      errorRate: parseFloat(process.env.MONITOR_ERROR_RATE) || 0.02, // 2%
      criticalErrorRate: parseFloat(process.env.MONITOR_CRITICAL_ERROR_RATE) || 0.05, // 5%
      
      // Business metrics for FloWorx
      onboardingFailureRate: parseFloat(process.env.MONITOR_ONBOARDING_FAILURE_RATE) || 0.10, // 10%
      workflowExecutionFailureRate: parseFloat(process.env.MONITOR_WORKFLOW_FAILURE_RATE) || 0.05, // 5%
      oauthConnectionFailureRate: parseFloat(process.env.MONITOR_OAUTH_FAILURE_RATE) || 0.03 // 3%
    },

    // Data retention policies
    retention: {
      queryMetrics: parseInt(process.env.MONITOR_QUERY_RETENTION_HOURS, 10) || 24, // 24 hours
      errorData: parseInt(process.env.MONITOR_ERROR_RETENTION_DAYS, 10) || 30, // 30 days
      performanceMetrics: parseInt(process.env.MONITOR_PERFORMANCE_RETENTION_DAYS, 10) || 7, // 7 days
      alertHistory: parseInt(process.env.MONITOR_ALERT_RETENTION_DAYS, 10) || 90 // 90 days
    },

    // Collection intervals
    intervals: {
      metricsCollection: parseInt(process.env.MONITOR_METRICS_INTERVAL_MS, 10) || 30000, // 30 seconds
      healthCheck: parseInt(process.env.MONITOR_HEALTH_CHECK_INTERVAL_MS, 10) || 60000, // 1 minute
      alertCheck: parseInt(process.env.MONITOR_ALERT_CHECK_INTERVAL_MS, 10) || 60000, // 1 minute
      cleanup: parseInt(process.env.MONITOR_CLEANUP_INTERVAL_MS, 10) || 3600000 // 1 hour
    }
  },

  // Error tracking configuration
  errorTracking: {
    enabled: true,
    
    // File logging settings
    fileLogging: {
      enabled: process.env.ERROR_FILE_LOGGING === 'true',
      directory: process.env.ERROR_LOG_DIRECTORY || '/var/log/floworx/errors',
      maxFileSize: process.env.ERROR_LOG_MAX_SIZE || '100MB',
      maxFiles: parseInt(process.env.ERROR_LOG_MAX_FILES, 10) || 10,
      rotationInterval: process.env.ERROR_LOG_ROTATION || 'daily'
    },

    // External integrations
    integrations: {
      // Sentry integration
      sentry: {
        enabled: process.env.SENTRY_ENABLED === 'true',
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV,
        release: process.env.APP_VERSION,
        sampleRate: parseFloat(process.env.SENTRY_SAMPLE_RATE) || 1.0
      },

      // DataDog integration
      datadog: {
        enabled: process.env.DATADOG_ENABLED === 'true',
        apiKey: process.env.DATADOG_API_KEY,
        appKey: process.env.DATADOG_APP_KEY,
        site: process.env.DATADOG_SITE || 'datadoghq.com'
      },

      // New Relic integration
      newRelic: {
        enabled: process.env.NEW_RELIC_ENABLED === 'true',
        licenseKey: process.env.NEW_RELIC_LICENSE_KEY,
        appName: process.env.NEW_RELIC_APP_NAME || 'FloWorx-Production'
      }
    },

    // Alert severity mapping
    severityMapping: {
      critical: ['system', 'database', 'authentication'],
      high: ['external_service', 'business_logic'],
      medium: ['validation', 'network'],
      low: ['client', 'unknown']
    }
  },

  // Alerting configuration
  alerting: {
    enabled: true,
    
    // Alert channels
    channels: {
      // Slack integration
      slack: {
        enabled: process.env.SLACK_ALERTS_ENABLED === 'true',
        webhookUrl: process.env.SLACK_WEBHOOK_URL,
        channel: process.env.SLACK_ALERT_CHANNEL || '#floworx-alerts',
        username: 'FloWorx Monitor',
        iconEmoji: ':warning:'
      },

      // Email alerts
      email: {
        enabled: process.env.EMAIL_ALERTS_ENABLED === 'true',
        smtpHost: process.env.SMTP_HOST,
        smtpPort: parseInt(process.env.SMTP_PORT, 10) || 587,
        smtpUser: process.env.SMTP_USER,
        smtpPassword: process.env.SMTP_PASSWORD,
        fromAddress: process.env.ALERT_FROM_EMAIL || 'alerts@floworx-iq.com',
        recipients: {
          critical: (process.env.CRITICAL_ALERT_EMAILS || '').split(',').filter(Boolean),
          high: (process.env.HIGH_ALERT_EMAILS || '').split(',').filter(Boolean),
          medium: (process.env.MEDIUM_ALERT_EMAILS || '').split(',').filter(Boolean)
        }
      },

      // PagerDuty integration
      pagerDuty: {
        enabled: process.env.PAGERDUTY_ENABLED === 'true',
        integrationKey: process.env.PAGERDUTY_INTEGRATION_KEY,
        serviceKey: process.env.PAGERDUTY_SERVICE_KEY
      },

      // Microsoft Teams integration
      teams: {
        enabled: process.env.TEAMS_ALERTS_ENABLED === 'true',
        webhookUrl: process.env.TEAMS_WEBHOOK_URL
      }
    },

    // Alert rules and escalation
    rules: {
      // Cooldown periods to prevent alert spam
      cooldowns: {
        critical: parseInt(process.env.ALERT_COOLDOWN_CRITICAL_MS, 10) || 300000, // 5 minutes
        high: parseInt(process.env.ALERT_COOLDOWN_HIGH_MS, 10) || 900000, // 15 minutes
        medium: parseInt(process.env.ALERT_COOLDOWN_MEDIUM_MS, 10) || 1800000, // 30 minutes
        low: parseInt(process.env.ALERT_COOLDOWN_LOW_MS, 10) || 3600000 // 1 hour
      },

      // Escalation rules
      escalation: {
        enabled: process.env.ALERT_ESCALATION_ENABLED === 'true',
        timeouts: {
          critical: parseInt(process.env.ESCALATION_CRITICAL_MS, 10) || 900000, // 15 minutes
          high: parseInt(process.env.ESCALATION_HIGH_MS, 10) || 1800000, // 30 minutes
          medium: parseInt(process.env.ESCALATION_MEDIUM_MS, 10) || 3600000 // 1 hour
        }
      }
    }
  },

  // Business metrics specific to FloWorx
  businessMetrics: {
    enabled: true,
    
    // SaaS-specific KPIs
    kpis: {
      // User onboarding metrics
      onboarding: {
        trackCompletionRate: true,
        trackTimeToComplete: true,
        trackDropoffPoints: true,
        alertOnHighDropoff: true
      },

      // OAuth connection health
      oauth: {
        trackConnectionSuccess: true,
        trackTokenRefreshFailures: true,
        trackServiceAvailability: true,
        alertOnServiceDown: true
      },

      // Workflow execution metrics
      workflows: {
        trackExecutionSuccess: true,
        trackExecutionTime: true,
        trackN8nConnectivity: true,
        alertOnHighFailureRate: true
      },

      // User engagement
      engagement: {
        trackActiveUsers: true,
        trackFeatureUsage: true,
        trackRetentionRates: true,
        alertOnChurnSpikes: true
      }
    },

    // Business hour definitions
    businessHours: {
      timezone: process.env.BUSINESS_TIMEZONE || 'America/New_York',
      start: process.env.BUSINESS_HOURS_START || '09:00',
      end: process.env.BUSINESS_HOURS_END || '17:00',
      weekdays: [1, 2, 3, 4, 5] // Monday to Friday
    }
  },

  // Health check configuration
  healthChecks: {
    enabled: true,
    
    // External service health checks
    services: {
      database: {
        enabled: true,
        timeout: parseInt(process.env.HEALTH_CHECK_DB_TIMEOUT_MS, 10) || 5000,
        query: 'SELECT 1 as health_check'
      },
      
      n8n: {
        enabled: process.env.N8N_HEALTH_CHECK_ENABLED === 'true',
        url: process.env.N8N_HEALTH_CHECK_URL,
        timeout: parseInt(process.env.HEALTH_CHECK_N8N_TIMEOUT_MS, 10) || 10000
      },

      gmail: {
        enabled: true,
        timeout: parseInt(process.env.HEALTH_CHECK_GMAIL_TIMEOUT_MS, 10) || 15000
      },

      supabase: {
        enabled: process.env.SUPABASE_HEALTH_CHECK_ENABLED === 'true',
        url: process.env.SUPABASE_URL,
        timeout: parseInt(process.env.HEALTH_CHECK_SUPABASE_TIMEOUT_MS, 10) || 10000
      }
    },

    // Health check intervals
    intervals: {
      internal: parseInt(process.env.HEALTH_CHECK_INTERNAL_INTERVAL_MS, 10) || 30000, // 30 seconds
      external: parseInt(process.env.HEALTH_CHECK_EXTERNAL_INTERVAL_MS, 10) || 60000, // 1 minute
      deep: parseInt(process.env.HEALTH_CHECK_DEEP_INTERVAL_MS, 10) || 300000 // 5 minutes
    }
  },

  // Performance optimization
  optimization: {
    enabled: true,
    
    // Auto-scaling triggers
    autoScaling: {
      enabled: process.env.AUTO_SCALING_ENABLED === 'true',
      triggers: {
        cpuThreshold: parseFloat(process.env.AUTO_SCALE_CPU_THRESHOLD) || 0.70,
        memoryThreshold: parseFloat(process.env.AUTO_SCALE_MEMORY_THRESHOLD) || 0.80,
        responseTimeThreshold: parseInt(process.env.AUTO_SCALE_RESPONSE_TIME_MS, 10) || 2000
      }
    },

    // Cache optimization
    caching: {
      enabled: true,
      redis: {
        enabled: process.env.REDIS_ENABLED === 'true',
        url: process.env.REDIS_URL,
        maxMemory: process.env.REDIS_MAX_MEMORY || '256mb',
        evictionPolicy: process.env.REDIS_EVICTION_POLICY || 'allkeys-lru'
      }
    }
  },

  // Security monitoring
  security: {
    enabled: true,
    
    // Rate limiting monitoring
    rateLimiting: {
      trackViolations: true,
      alertOnSuspiciousActivity: true,
      blockThreshold: parseInt(process.env.SECURITY_BLOCK_THRESHOLD, 10) || 100
    },

    // Authentication monitoring
    authentication: {
      trackFailedLogins: true,
      trackSuspiciousPatterns: true,
      alertOnBruteForce: true,
      lockoutThreshold: parseInt(process.env.AUTH_LOCKOUT_THRESHOLD, 10) || 5
    }
  }
};

module.exports = productionMonitoringConfig;
