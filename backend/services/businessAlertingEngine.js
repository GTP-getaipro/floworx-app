/**
 * Business Alerting Engine
 * Implements business-driven alerting rules with SLA monitoring and escalation procedures
 */

const EventEmitter = require('events');
const businessAlertingRules = require('../config/business-alerting-rules');
const logger = require('../utils/logger');

class BusinessAlertingEngine extends EventEmitter {
  constructor() {
    super();
    this.rules = businessAlertingRules;
    this.activeAlerts = new Map();
    this.suppressedAlerts = new Set();
    this.escalationTimers = new Map();
    this.alertCorrelation = new Map();
    this.maintenanceWindows = new Set();
    
    // Business context tracking
    this.businessMetrics = {
      activeUsers: 0,
      onboardingUsers: 0,
      workflowUsers: 0,
      payingCustomers: 0,
      revenueImpact: 0
    };

    this.isInitialized = false;
  }

  /**
   * Initialize the business alerting engine
   */
  async initialize() {
    if (this.isInitialized) {return;}

    try {
      // Set up rule evaluation intervals
      this.setupRuleEvaluation();

      // Initialize business context
      await this.initializeBusinessContext();

      // Set up escalation procedures
      this.setupEscalationProcedures();

      // Set up alert correlation
      this.setupAlertCorrelation();

      // Set up maintenance window handling
      this.setupMaintenanceWindows();

      this.isInitialized = true;
      logger.info('Business alerting engine initialized');
      this.emit('alerting:initialized');

    } catch (error) {
      logger.error('Failed to initialize business alerting engine', { error: error.message });
      throw error;
    }
  }

  /**
   * Evaluate business rules against current metrics
   */
  async evaluateBusinessRules(metrics) {
    if (!this.isInitialized) {return;}

    try {
      // Update business context
      await this.updateBusinessContext(metrics);

      // Evaluate SLA rules
      await this.evaluateSLARules(metrics);

      // Evaluate user impact rules
      await this.evaluateUserImpactRules(metrics);

      // Evaluate business process rules
      await this.evaluateBusinessProcessRules(metrics);

      // Apply time-based rules
      this.applyTimeBasedRules();

      // Process alert correlations
      this.processAlertCorrelations();

    } catch (error) {
      logger.error('Failed to evaluate business rules', { error: error.message });
    }
  }

  /**
   * Evaluate SLA-based rules
   */
  async evaluateSLARules(metrics) {
    const slaRules = this.rules.slaRules;

    // API Response Time SLA
    if (slaRules.apiResponseTime.enabled) {
      const avgResponseTime = metrics.monitoring?.performance?.averageResponseTime || 0;
      
      for (const rule of slaRules.apiResponseTime.rules) {
        if (this.evaluateCondition(rule.condition, { average_response_time: avgResponseTime })) {
          await this.createBusinessAlert({
            type: 'sla_violation',
            subtype: 'api_response_time',
            severity: rule.severity,
            message: rule.message,
            businessImpact: rule.businessImpact,
            affectedUsers: rule.affectedUsers,
            escalationTime: rule.escalationTime,
            channels: rule.channels,
            metrics: { avgResponseTime },
            slaThreshold: rule.condition
          });
        }
      }
    }

    // System Availability SLA
    if (slaRules.systemAvailability.enabled) {
      const uptime = process.uptime();
      const uptimePercentage = this.calculateUptimePercentage(uptime);
      
      for (const rule of slaRules.systemAvailability.rules) {
        if (this.evaluateCondition(rule.condition, { uptime_percentage: uptimePercentage })) {
          await this.createBusinessAlert({
            type: 'sla_violation',
            subtype: 'system_availability',
            severity: rule.severity,
            message: rule.message,
            businessImpact: rule.businessImpact,
            affectedUsers: rule.affectedUsers,
            escalationTime: rule.escalationTime,
            channels: rule.channels,
            metrics: { uptimePercentage },
            slaThreshold: rule.condition
          });
        }
      }
    }
  }

  /**
   * Evaluate user impact rules
   */
  async evaluateUserImpactRules(metrics) {
    const userImpactRules = this.rules.userImpactRules;

    // Onboarding Impact
    if (userImpactRules.onboardingImpact.enabled) {
      const onboardingFailureRate = await this.calculateOnboardingFailureRate();
      
      for (const rule of userImpactRules.onboardingImpact.rules) {
        if (this.evaluateCondition(rule.condition, { onboarding_failure_rate: onboardingFailureRate })) {
          await this.createBusinessAlert({
            type: 'user_impact',
            subtype: 'onboarding_failure',
            severity: rule.severity,
            message: rule.message,
            businessImpact: rule.businessImpact,
            affectedUsers: rule.affectedUsers,
            escalationTime: rule.escalationTime,
            channels: rule.channels,
            businessContext: rule.businessContext,
            metrics: { onboardingFailureRate },
            affectedUserCount: this.businessMetrics.onboardingUsers
          });
        }
      }
    }

    // OAuth Impact
    if (userImpactRules.oauthImpact.enabled) {
      const oauthFailureRate = await this.calculateOAuthFailureRate();
      
      for (const rule of userImpactRules.oauthImpact.rules) {
        if (this.evaluateCondition(rule.condition, { oauth_failure_rate: oauthFailureRate })) {
          await this.createBusinessAlert({
            type: 'user_impact',
            subtype: 'oauth_failure',
            severity: rule.severity,
            message: rule.message,
            businessImpact: rule.businessImpact,
            affectedUsers: rule.affectedUsers,
            escalationTime: rule.escalationTime,
            channels: rule.channels,
            businessContext: rule.businessContext,
            metrics: { oauthFailureRate }
          });
        }
      }
    }
  }

  /**
   * Evaluate business process rules
   */
  async evaluateBusinessProcessRules(metrics) {
    const businessProcessRules = this.rules.businessProcessRules;

    // Revenue Impact
    if (businessProcessRules.revenueImpact.enabled) {
      const paymentFailureRate = await this.calculatePaymentFailureRate();
      
      for (const rule of businessProcessRules.revenueImpact.rules) {
        if (this.evaluateCondition(rule.condition, { payment_processing_failure_rate: paymentFailureRate })) {
          await this.createBusinessAlert({
            type: 'business_process',
            subtype: 'revenue_impact',
            severity: rule.severity,
            message: rule.message,
            businessImpact: rule.businessImpact,
            affectedUsers: rule.affectedUsers,
            escalationTime: rule.escalationTime,
            channels: rule.channels,
            businessContext: rule.businessContext,
            metrics: { paymentFailureRate },
            revenueImpact: this.calculateRevenueImpact(paymentFailureRate)
          });
        }
      }
    }
  }

  /**
   * Create business alert with enhanced context
   */
  async createBusinessAlert(alertData) {
    const alertId = this.generateAlertId();
    const timestamp = Date.now();

    // Check if alert should be suppressed
    if (this.shouldSuppressAlert(alertData)) {
      logger.info('Alert suppressed', { alertId, type: alertData.type, reason: 'suppression_rule' });
      return;
    }

    // Check for alert correlation
    const correlatedAlerts = this.findCorrelatedAlerts(alertData);
    if (correlatedAlerts.length > 0) {
      return this.handleCorrelatedAlert(alertData, correlatedAlerts);
    }

    const businessAlert = {
      id: alertId,
      timestamp,
      ...alertData,
      businessContext: {
        ...alertData.businessContext,
        activeUsers: this.businessMetrics.activeUsers,
        payingCustomers: this.businessMetrics.payingCustomers,
        businessHours: this.isBusinessHours(),
        peakHours: this.isPeakHours()
      },
      escalation: {
        level: 1,
        nextEscalationTime: timestamp + (alertData.escalationTime * 60 * 1000),
        escalationHistory: []
      }
    };

    // Store active alert
    this.activeAlerts.set(alertId, businessAlert);

    // Set up escalation timer
    this.setupEscalationTimer(businessAlert);

    // Send initial notifications
    await this.sendAlertNotifications(businessAlert);

    // Emit alert event
    this.emit('business:alert:created', businessAlert);

    logger.info('Business alert created', {
      alertId,
      type: alertData.type,
      severity: alertData.severity,
      businessImpact: alertData.businessImpact,
      affectedUsers: alertData.affectedUsers
    });

    return businessAlert;
  }

  /**
   * Setup escalation timer for alert
   */
  setupEscalationTimer(alert) {
    const escalationTime = alert.escalation.nextEscalationTime - Date.now();
    
    if (escalationTime > 0) {
      const timer = setTimeout(async () => {
        await this.escalateAlert(alert.id);
      }, escalationTime);

      this.escalationTimers.set(alert.id, timer);
    }
  }

  /**
   * Escalate alert to next level
   */
  async escalateAlert(alertId) {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) {return;}

    const currentLevel = alert.escalation.level;
    const nextLevel = Math.min(currentLevel + 1, 4); // Max level 4

    const escalationProcedure = this.rules.escalationProcedures[`level${nextLevel}`];
    if (!escalationProcedure) {return;}

    // Update alert escalation
    alert.escalation.level = nextLevel;
    alert.escalation.escalationHistory.push({
      level: nextLevel,
      timestamp: Date.now(),
      procedure: escalationProcedure.name
    });

    // Calculate next escalation time
    if (nextLevel < 4) {
      const nextEscalationProcedure = this.rules.escalationProcedures[`level${nextLevel + 1}`];
      if (nextEscalationProcedure) {
        alert.escalation.nextEscalationTime = Date.now() + (nextEscalationProcedure.timeframe * 60 * 1000);
        this.setupEscalationTimer(alert);
      }
    }

    // Execute escalation actions
    await this.executeEscalationActions(alert, escalationProcedure);

    // Send escalated notifications
    await this.sendEscalatedNotifications(alert, escalationProcedure);

    logger.warn('Alert escalated', {
      alertId,
      level: nextLevel,
      procedure: escalationProcedure.name,
      businessImpact: alert.businessImpact
    });

    this.emit('business:alert:escalated', { alert, level: nextLevel });
  }

  /**
   * Execute escalation actions
   */
  async executeEscalationActions(alert, procedure) {
    for (const action of procedure.actions) {
      try {
        switch (action) {
          case 'log_alert':
            logger.error('ESCALATED ALERT', { alert });
            break;
          case 'create_incident_ticket':
            await this.createIncidentTicket(alert);
            break;
          case 'schedule_war_room':
            await this.scheduleWarRoom(alert);
            break;
          case 'notify_customer_success':
            await this.notifyCustomerSuccess(alert);
            break;
          case 'prepare_customer_communication':
            await this.prepareCustomerCommunication(alert);
            break;
          case 'activate_crisis_protocol':
            await this.activateCrisisProtocol(alert);
            break;
        }
      } catch (error) {
        logger.error(`Failed to execute escalation action: ${action}`, { error: error.message });
      }
    }
  }

  /**
   * Calculate business metrics
   */
  async updateBusinessContext(metrics) {
    try {
      const { query } = require('../database/unified-connection');
      
      // Get active user counts
      const activeUsersResult = await query(`
        SELECT 
          COUNT(DISTINCT u.id) as total_active,
          COUNT(DISTINCT CASE WHEN u.onboarding_completed = false THEN u.id END) as onboarding_users,
          COUNT(DISTINCT CASE WHEN wd.id IS NOT NULL THEN u.id END) as workflow_users,
          COUNT(DISTINCT CASE WHEN u.subscription_status = 'active' THEN u.id END) as paying_customers
        FROM users u
        LEFT JOIN workflow_deployments wd ON u.id = wd.user_id
        WHERE u.created_at >= NOW() - INTERVAL '24 hours'
      `);

      if (activeUsersResult.rows.length > 0) {
        const row = activeUsersResult.rows[0];
        this.businessMetrics = {
          activeUsers: parseInt(row.total_active) || 0,
          onboardingUsers: parseInt(row.onboarding_users) || 0,
          workflowUsers: parseInt(row.workflow_users) || 0,
          payingCustomers: parseInt(row.paying_customers) || 0
        };
      }
    } catch (error) {
      logger.error('Failed to update business context', { error: error.message });
    }
  }

  /**
   * Calculate onboarding failure rate
   */
  async calculateOnboardingFailureRate() {
    try {
      const { query } = require('../database/unified-connection');
      
      const result = await query(`
        SELECT 
          COUNT(*) as total_attempts,
          COUNT(CASE WHEN onboarding_completed = false THEN 1 END) as failed_attempts
        FROM users 
        WHERE created_at >= NOW() - INTERVAL '1 hour'
      `);

      const { total_attempts, failed_attempts } = result.rows[0];
      return total_attempts > 0 ? failed_attempts / total_attempts : 0;
    } catch (error) {
      logger.error('Failed to calculate onboarding failure rate', { error: error.message });
      return 0;
    }
  }

  /**
   * Calculate OAuth failure rate
   */
  async calculateOAuthFailureRate() {
    try {
      const { query } = require('../database/unified-connection');
      
      const result = await query(`
        SELECT 
          COUNT(*) as total_attempts,
          COUNT(CASE WHEN access_token IS NULL THEN 1 END) as failed_attempts
        FROM credentials 
        WHERE created_at >= NOW() - INTERVAL '1 hour'
        AND service_name = 'google'
      `);

      const { total_attempts, failed_attempts } = result.rows[0];
      return total_attempts > 0 ? failed_attempts / total_attempts : 0;
    } catch (error) {
      logger.error('Failed to calculate OAuth failure rate', { error: error.message });
      return 0;
    }
  }

  /**
   * Calculate payment failure rate
   */
  async calculatePaymentFailureRate() {
    // This would integrate with your payment processor
    // For now, return a mock value
    return 0;
  }

  /**
   * Check if current time is business hours
   */
  isBusinessHours() {
    const now = new Date();
    const businessHours = this.rules.timeBasedRules.businessHours.businessHours;
    
    const currentHour = now.getHours();
    const currentDay = now.getDay();
    const startHour = parseInt(businessHours.start.split(':')[0]);
    const endHour = parseInt(businessHours.end.split(':')[0]);

    return businessHours.weekdays.includes(currentDay) &&
           currentHour >= startHour &&
           currentHour < endHour;
  }

  /**
   * Check if current time is peak hours
   */
  isPeakHours() {
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const peakHours = this.rules.timeBasedRules.peakHours.peakHours;

    return peakHours.some(peak => currentTime >= peak.start && currentTime <= peak.end);
  }

  /**
   * Evaluate condition string
   */
  evaluateCondition(condition, variables) {
    try {
      // Simple condition evaluation
      // In production, use a proper expression evaluator
      const conditionStr = condition.replace(/(\w+)/g, (match) => {
        return variables[match] !== undefined ? variables[match] : match;
      });

      return eval(conditionStr);
    } catch (error) {
      logger.error('Failed to evaluate condition', { condition, error: error.message });
      return false;
    }
  }

  /**
   * Generate unique alert ID
   */
  generateAlertId() {
    return `biz_alert_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  /**
   * Get business alerting status
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      activeAlerts: this.activeAlerts.size,
      suppressedAlerts: this.suppressedAlerts.size,
      escalationTimers: this.escalationTimers.size,
      businessMetrics: this.businessMetrics,
      businessHours: this.isBusinessHours(),
      peakHours: this.isPeakHours()
    };
  }

  /**
   * Shutdown alerting engine
   */
  shutdown() {
    // Clear all timers
    for (const timer of this.escalationTimers.values()) {
      clearTimeout(timer);
    }
    
    this.escalationTimers.clear();
    this.activeAlerts.clear();
    this.isInitialized = false;
    
    logger.info('Business alerting engine shut down');
    this.emit('alerting:shutdown');
  }
}

// Export singleton instance
const businessAlertingEngine = new BusinessAlertingEngine();
module.exports = businessAlertingEngine;
