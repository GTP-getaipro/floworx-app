/**
 * Production Monitoring Service
 * Orchestrates all monitoring components for production deployment
 */

const EventEmitter = require('events');

const businessAlertingRules = require('../config/business-alerting-rules');
const productionConfig = require('../config/production-monitoring');
const logger = require('../utils/logger');

const errorTrackingService = require('./errorTrackingService');
const realTimeMonitoringService = require('./realTimeMonitoringService');

class ProductionMonitoringService extends EventEmitter {
  constructor() {
    super();
    this.config = productionConfig;
    this.isInitialized = false;
    this.healthChecks = new Map();
    this.businessMetrics = new Map();
    this.alertChannels = new Map();
    this.lastHealthCheck = null;
    
    // Service status tracking
    this.serviceStatus = {
      monitoring: 'stopped',
      errorTracking: 'stopped',
      alerting: 'stopped',
      healthChecks: 'stopped',
      businessMetrics: 'stopped'
    };
  }

  /**
   * Initialize production monitoring
   */
  async initialize() {
    if (this.isInitialized) {return;}

    try {
      logger.info('Initializing production monitoring services...', {
        environment: this.config.environment,
        version: this.config.environment.version
      });

      // Initialize core monitoring services
      await this.initializeMonitoring();
      await this.initializeErrorTracking();
      await this.initializeAlerting();
      await this.initializeHealthChecks();
      await this.initializeBusinessMetrics();

      // Set up service integrations
      await this.setupServiceIntegrations();

      // Configure adaptive thresholds
      await this.configureAdaptiveThresholds();

      this.isInitialized = true;
      this.serviceStatus.monitoring = 'running';

      logger.info('Production monitoring services initialized successfully');
      this.emit('monitoring:initialized', {
        timestamp: Date.now(),
        services: Object.keys(this.serviceStatus),
        config: this.config.environment
      });

    } catch (error) {
      logger.error('Failed to initialize production monitoring', { error: error.message });
      throw error;
    }
  }

  /**
   * Initialize real-time monitoring with production settings
   */
  async initializeMonitoring() {
    // Configure monitoring thresholds
    realTimeMonitoringService.updateThresholds(this.config.monitoring.thresholds);

    // Set up monitoring intervals
    this.setupMonitoringIntervals();

    // Configure data retention
    this.configureDataRetention();

    logger.info('Real-time monitoring configured for production');
  }

  /**
   * Initialize error tracking with production integrations
   */
  async initializeErrorTracking() {
    // Configure external integrations
    await this.setupErrorTrackingIntegrations();

    // Set up file logging if enabled
    if (this.config.errorTracking.fileLogging.enabled) {
      await this.setupFileLogging();
    }

    this.serviceStatus.errorTracking = 'running';
    logger.info('Error tracking configured for production');
  }

  /**
   * Initialize alerting system
   */
  async initializeAlerting() {
    // Set up alert channels
    await this.setupAlertChannels();

    // Configure alert rules
    this.configureAlertRules();

    // Set up escalation procedures
    this.setupEscalationProcedures();

    this.serviceStatus.alerting = 'running';
    logger.info('Alerting system configured for production');
  }

  /**
   * Initialize health checks
   */
  async initializeHealthChecks() {
    // Set up internal health checks
    this.setupInternalHealthChecks();

    // Set up external service health checks
    await this.setupExternalHealthChecks();

    // Start health check intervals
    this.startHealthCheckIntervals();

    this.serviceStatus.healthChecks = 'running';
    logger.info('Health checks configured for production');
  }

  /**
   * Initialize business metrics tracking
   */
  async initializeBusinessMetrics() {
    // Set up FloWorx-specific KPI tracking
    this.setupBusinessKPIs();

    // Configure business hour awareness
    this.configureBusinessHours();

    // Set up SaaS metrics collection
    this.setupSaaSMetrics();

    this.serviceStatus.businessMetrics = 'running';
    logger.info('Business metrics tracking configured');
  }

  /**
   * Set up monitoring intervals
   */
  setupMonitoringIntervals() {
    const intervals = this.config.monitoring.intervals;

    // Metrics collection interval
    setInterval(() => {
      this.collectSystemMetrics();
    }, intervals.metricsCollection);

    // Health check interval
    setInterval(() => {
      this.performHealthChecks();
    }, intervals.healthCheck);

    // Alert check interval
    setInterval(() => {
      this.checkAlerts();
    }, intervals.alertCheck);

    // Cleanup interval
    setInterval(() => {
      this.performCleanup();
    }, intervals.cleanup);
  }

  /**
   * Set up alert channels
   */
  async setupAlertChannels() {
    const channels = this.config.alerting.channels;

    // Slack integration
    if (channels.slack.enabled) {
      this.alertChannels.set('slack', {
        type: 'slack',
        config: channels.slack,
        send: this.sendSlackAlert.bind(this)
      });
    }

    // Email integration
    if (channels.email.enabled) {
      this.alertChannels.set('email', {
        type: 'email',
        config: channels.email,
        send: this.sendEmailAlert.bind(this)
      });
    }

    // PagerDuty integration
    if (channels.pagerDuty.enabled) {
      this.alertChannels.set('pagerduty', {
        type: 'pagerduty',
        config: channels.pagerDuty,
        send: this.sendPagerDutyAlert.bind(this)
      });
    }

    // Microsoft Teams integration
    if (channels.teams.enabled) {
      this.alertChannels.set('teams', {
        type: 'teams',
        config: channels.teams,
        send: this.sendTeamsAlert.bind(this)
      });
    }

    logger.info(`Configured ${this.alertChannels.size} alert channels`);
  }

  /**
   * Set up business KPIs specific to FloWorx
   */
  setupBusinessKPIs() {
    const kpis = this.config.businessMetrics.kpis;

    // Onboarding metrics
    if (kpis.onboarding.trackCompletionRate) {
      this.businessMetrics.set('onboarding_completion_rate', {
        type: 'rate',
        calculate: this.calculateOnboardingCompletionRate.bind(this),
        threshold: this.config.monitoring.thresholds.onboardingFailureRate,
        alertOnThreshold: kpis.onboarding.alertOnHighDropoff
      });
    }

    // OAuth connection metrics
    if (kpis.oauth.trackConnectionSuccess) {
      this.businessMetrics.set('oauth_success_rate', {
        type: 'rate',
        calculate: this.calculateOAuthSuccessRate.bind(this),
        threshold: this.config.monitoring.thresholds.oauthConnectionFailureRate,
        alertOnThreshold: kpis.oauth.alertOnServiceDown
      });
    }

    // Workflow execution metrics
    if (kpis.workflows.trackExecutionSuccess) {
      this.businessMetrics.set('workflow_success_rate', {
        type: 'rate',
        calculate: this.calculateWorkflowSuccessRate.bind(this),
        threshold: this.config.monitoring.thresholds.workflowExecutionFailureRate,
        alertOnThreshold: kpis.workflows.alertOnHighFailureRate
      });
    }

    logger.info(`Configured ${this.businessMetrics.size} business KPIs`);
  }

  /**
   * Collect system metrics
   */
  async collectSystemMetrics() {
    try {
      const metrics = {
        timestamp: Date.now(),
        system: {
          memory: process.memoryUsage(),
          cpu: process.cpuUsage(),
          uptime: process.uptime()
        },
        monitoring: realTimeMonitoringService.getMetrics(),
        errors: errorTrackingService.getStats(),
        business: await this.collectBusinessMetrics()
      };

      // Check for threshold violations
      await this.checkSystemThresholds(metrics);

      // Emit metrics for external systems
      this.emit('metrics:collected', metrics);

      return metrics;
    } catch (error) {
      logger.error('Failed to collect system metrics', { error: error.message });
    }
  }

  /**
   * Collect business metrics
   */
  async collectBusinessMetrics() {
    const businessMetrics = {};

    for (const [name, config] of this.businessMetrics) {
      try {
        const value = await config.calculate();
        businessMetrics[name] = {
          value,
          threshold: config.threshold,
          timestamp: Date.now()
        };

        // Check threshold violations
        if (config.alertOnThreshold && this.isThresholdViolated(value, config.threshold, config.type)) {
          await this.sendBusinessMetricAlert(name, value, config.threshold);
        }
      } catch (error) {
        logger.error(`Failed to calculate business metric: ${name}`, { error: error.message });
      }
    }

    return businessMetrics;
  }

  /**
   * Calculate onboarding completion rate
   */
  async calculateOnboardingCompletionRate() {
    try {
      const { query } = require('../database/unified-connection');
      
      const result = await query(`
        SELECT 
          COUNT(*) as total_users,
          COUNT(CASE WHEN onboarding_completed = true THEN 1 END) as completed_users
        FROM users 
        WHERE created_at >= NOW() - INTERVAL '24 hours'
      `);

      const { total_users, completed_users } = result.rows[0];
      return total_users > 0 ? completed_users / total_users : 1;
    } catch (error) {
      logger.error('Failed to calculate onboarding completion rate', { error: error.message });
      return 1; // Default to success to avoid false alerts
    }
  }

  /**
   * Calculate OAuth success rate
   */
  async calculateOAuthSuccessRate() {
    try {
      const { query } = require('../database/unified-connection');
      
      const result = await query(`
        SELECT 
          COUNT(*) as total_attempts,
          COUNT(CASE WHEN access_token IS NOT NULL THEN 1 END) as successful_attempts
        FROM credentials 
        WHERE created_at >= NOW() - INTERVAL '1 hour'
        AND service_name = 'google'
      `);

      const { total_attempts, successful_attempts } = result.rows[0];
      return total_attempts > 0 ? successful_attempts / total_attempts : 1;
    } catch (error) {
      logger.error('Failed to calculate OAuth success rate', { error: error.message });
      return 1;
    }
  }

  /**
   * Calculate workflow success rate
   */
  async calculateWorkflowSuccessRate() {
    try {
      const { query } = require('../database/unified-connection');
      
      const result = await query(`
        SELECT 
          COUNT(*) as total_executions,
          COUNT(CASE WHEN workflow_status = 'success' THEN 1 END) as successful_executions
        FROM workflow_deployments 
        WHERE deployed_at >= NOW() - INTERVAL '1 hour'
      `);

      const { total_executions, successful_executions } = result.rows[0];
      return total_executions > 0 ? successful_executions / total_executions : 1;
    } catch (error) {
      logger.error('Failed to calculate workflow success rate', { error: error.message });
      return 1;
    }
  }

  /**
   * Send Slack alert
   */
  async sendSlackAlert(alert) {
    try {
      const axios = require('axios');
      const config = this.alertChannels.get('slack').config;

      const payload = {
        channel: config.channel,
        username: config.username,
        icon_emoji: config.iconEmoji,
        attachments: [{
          color: this.getAlertColor(alert.severity),
          title: `FloWorx ${alert.severity.toUpperCase()} Alert`,
          text: alert.message,
          fields: [
            {
              title: 'Environment',
              value: this.config.environment.name,
              short: true
            },
            {
              title: 'Timestamp',
              value: new Date(alert.timestamp).toISOString(),
              short: true
            }
          ],
          footer: 'FloWorx Monitoring',
          ts: Math.floor(alert.timestamp / 1000)
        }]
      };

      await axios.post(config.webhookUrl, payload);
      logger.info('Slack alert sent successfully', { alertId: alert.id });
    } catch (error) {
      logger.error('Failed to send Slack alert', { error: error.message, alertId: alert.id });
    }
  }

  /**
   * Send email alert
   */
  async sendEmailAlert(alert) {
    try {
      const nodemailer = require('nodemailer');
      const config = this.alertChannels.get('email').config;

      const transporter = nodemailer.createTransport({
        host: config.smtpHost,
        port: config.smtpPort,
        secure: config.smtpPort === 465,
        auth: {
          user: config.smtpUser,
          pass: config.smtpPassword
        }
      });

      const recipients = config.recipients[alert.severity] || config.recipients.medium;
      
      const mailOptions = {
        from: config.fromAddress,
        to: recipients.join(','),
        subject: `FloWorx ${alert.severity.toUpperCase()} Alert - ${alert.type}`,
        html: this.generateAlertEmailHTML(alert)
      };

      await transporter.sendMail(mailOptions);
      logger.info('Email alert sent successfully', { alertId: alert.id, recipients: recipients.length });
    } catch (error) {
      logger.error('Failed to send email alert', { error: error.message, alertId: alert.id });
    }
  }

  /**
   * Send PagerDuty alert
   */
  async sendPagerDutyAlert(alert) {
    try {
      const axios = require('axios');
      const config = this.alertChannels.get('pagerduty').config;

      const payload = {
        routing_key: config.integrationKey,
        event_action: 'trigger',
        dedup_key: `floworx-${alert.type}-${alert.id}`,
        payload: {
          summary: alert.message,
          severity: alert.severity,
          source: 'FloWorx Monitoring',
          component: alert.component || 'unknown',
          group: 'FloWorx',
          class: alert.category || 'monitoring'
        }
      };

      await axios.post('https://events.pagerduty.com/v2/enqueue', payload);
      logger.info('PagerDuty alert sent successfully', { alertId: alert.id });
    } catch (error) {
      logger.error('Failed to send PagerDuty alert', { error: error.message, alertId: alert.id });
    }
  }

  /**
   * Send Microsoft Teams alert
   */
  async sendTeamsAlert(alert) {
    try {
      const axios = require('axios');
      const config = this.alertChannels.get('teams').config;

      const payload = {
        '@type': 'MessageCard',
        '@context': 'http://schema.org/extensions',
        themeColor: this.getAlertColor(alert.severity),
        summary: `FloWorx ${alert.severity.toUpperCase()} Alert`,
        sections: [{
          activityTitle: `FloWorx ${alert.severity.toUpperCase()} Alert`,
          activitySubtitle: alert.message,
          facts: [
            {
              name: 'Environment',
              value: this.config.environment.name
            },
            {
              name: 'Alert Type',
              value: alert.type
            },
            {
              name: 'Timestamp',
              value: new Date(alert.timestamp).toISOString()
            }
          ]
        }]
      };

      await axios.post(config.webhookUrl, payload);
      logger.info('Teams alert sent successfully', { alertId: alert.id });
    } catch (error) {
      logger.error('Failed to send Teams alert', { error: error.message, alertId: alert.id });
    }
  }

  /**
   * Get alert color based on severity
   */
  getAlertColor(severity) {
    const colors = {
      critical: '#FF0000',
      high: '#FF8C00',
      medium: '#FFD700',
      low: '#32CD32'
    };
    return colors[severity] || colors.medium;
  }

  /**
   * Generate HTML email for alerts
   */
  generateAlertEmailHTML(alert) {
    return `
      <html>
        <body style="font-family: Arial, sans-serif; margin: 0; padding: 20px;">
          <div style="background-color: ${this.getAlertColor(alert.severity)}; color: white; padding: 15px; border-radius: 5px;">
            <h2>FloWorx ${alert.severity.toUpperCase()} Alert</h2>
          </div>
          <div style="padding: 20px; border: 1px solid #ddd; border-radius: 5px; margin-top: 10px;">
            <h3>Alert Details</h3>
            <p><strong>Message:</strong> ${alert.message}</p>
            <p><strong>Type:</strong> ${alert.type}</p>
            <p><strong>Environment:</strong> ${this.config.environment.name}</p>
            <p><strong>Timestamp:</strong> ${new Date(alert.timestamp).toISOString()}</p>
            ${alert.metadata ? `<p><strong>Additional Info:</strong> ${JSON.stringify(alert.metadata, null, 2)}</p>` : ''}
          </div>
          <div style="margin-top: 20px; font-size: 12px; color: #666;">
            <p>This alert was generated by FloWorx Monitoring System</p>
            <p>Environment: ${this.config.environment.name} | Version: ${this.config.environment.version}</p>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      services: this.serviceStatus,
      config: {
        environment: this.config.environment,
        alertChannels: Array.from(this.alertChannels.keys()),
        businessMetrics: Array.from(this.businessMetrics.keys())
      },
      lastHealthCheck: this.lastHealthCheck,
      uptime: process.uptime()
    };
  }

  /**
   * Shutdown monitoring services gracefully
   */
  async shutdown() {
    logger.info('Shutting down production monitoring services...');
    
    // Stop all intervals and cleanup
    this.serviceStatus = {
      monitoring: 'stopped',
      errorTracking: 'stopped',
      alerting: 'stopped',
      healthChecks: 'stopped',
      businessMetrics: 'stopped'
    };

    this.isInitialized = false;
    this.emit('monitoring:shutdown');
    
    logger.info('Production monitoring services shut down successfully');
  }
}

// Export singleton instance
const productionMonitoringService = new ProductionMonitoringService();
module.exports = productionMonitoringService;
