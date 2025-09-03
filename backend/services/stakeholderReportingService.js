/**
 * Stakeholder Reporting Service
 * Automated reporting system for executives, operations, and development teams
 */

const EventEmitter = require('events');
const cron = require('node-cron');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

class StakeholderReportingService extends EventEmitter {
  constructor() {
    super();
    this.reportSchedules = new Map();
    this.reportTemplates = new Map();
    this.reportHistory = new Map();
    this.isInitialized = false;
    
    // Report configurations for different stakeholder groups
    this.stakeholderConfigs = {
      executives: {
        name: 'Executive Dashboard',
        frequency: 'daily',
        schedule: '0 8 * * *', // 8 AM daily
        recipients: process.env.EXECUTIVE_REPORT_EMAILS?.split(',') || [],
        format: ['email', 'pdf'],
        metrics: ['business_kpis', 'revenue_impact', 'user_growth', 'system_health_summary']
      },
      operations: {
        name: 'Operations Report',
        frequency: 'hourly',
        schedule: '0 * * * *', // Every hour
        recipients: process.env.OPERATIONS_REPORT_EMAILS?.split(',') || [],
        format: ['email', 'slack'],
        metrics: ['system_performance', 'error_rates', 'alert_summary', 'sla_status']
      },
      development: {
        name: 'Development Metrics',
        frequency: 'daily',
        schedule: '0 9 * * 1-5', // 9 AM weekdays
        recipients: process.env.DEVELOPMENT_REPORT_EMAILS?.split(',') || [],
        format: ['email', 'slack'],
        metrics: ['code_quality', 'deployment_metrics', 'error_analysis', 'performance_trends']
      },
      customerSuccess: {
        name: 'Customer Success Report',
        frequency: 'weekly',
        schedule: '0 10 * * 1', // 10 AM Mondays
        recipients: process.env.CUSTOMER_SUCCESS_REPORT_EMAILS?.split(',') || [],
        format: ['email', 'pdf'],
        metrics: ['user_engagement', 'onboarding_success', 'feature_adoption', 'support_metrics']
      }
    };
  }

  /**
   * Initialize the reporting service
   */
  async initialize() {
    if (this.isInitialized) {return;}

    try {
      // Set up report templates
      await this.initializeReportTemplates();

      // Schedule automated reports
      this.scheduleAutomatedReports();

      // Set up report storage
      await this.setupReportStorage();

      this.isInitialized = true;
      logger.info('Stakeholder reporting service initialized');
      this.emit('reporting:initialized');

    } catch (error) {
      logger.error('Failed to initialize stakeholder reporting service', { error: error.message });
      throw error;
    }
  }

  /**
   * Initialize report templates
   */
  async initializeReportTemplates() {
    // Executive Report Template
    this.reportTemplates.set('executives', {
      title: 'FloWorx Executive Dashboard',
      sections: [
        {
          name: 'Business KPIs',
          type: 'kpi_cards',
          metrics: ['active_users', 'revenue', 'churn_rate', 'customer_satisfaction']
        },
        {
          name: 'System Health',
          type: 'health_summary',
          metrics: ['uptime', 'performance', 'error_rate']
        },
        {
          name: 'Growth Metrics',
          type: 'trend_charts',
          metrics: ['user_growth', 'revenue_growth', 'feature_adoption']
        },
        {
          name: 'Key Issues',
          type: 'alert_summary',
          metrics: ['critical_alerts', 'business_impact']
        }
      ]
    });

    // Operations Report Template
    this.reportTemplates.set('operations', {
      title: 'FloWorx Operations Report',
      sections: [
        {
          name: 'System Performance',
          type: 'performance_metrics',
          metrics: ['response_times', 'throughput', 'resource_usage']
        },
        {
          name: 'Error Analysis',
          type: 'error_breakdown',
          metrics: ['error_rates', 'error_categories', 'top_errors']
        },
        {
          name: 'SLA Status',
          type: 'sla_dashboard',
          metrics: ['sla_compliance', 'sla_violations', 'sla_trends']
        },
        {
          name: 'Infrastructure Health',
          type: 'infrastructure_status',
          metrics: ['database_health', 'service_availability', 'capacity_usage']
        }
      ]
    });

    // Development Report Template
    this.reportTemplates.set('development', {
      title: 'FloWorx Development Metrics',
      sections: [
        {
          name: 'Code Quality',
          type: 'quality_metrics',
          metrics: ['test_coverage', 'code_complexity', 'technical_debt']
        },
        {
          name: 'Performance Analysis',
          type: 'performance_analysis',
          metrics: ['slow_queries', 'optimization_opportunities', 'performance_trends']
        },
        {
          name: 'Error Insights',
          type: 'error_insights',
          metrics: ['error_patterns', 'error_resolution_time', 'recurring_issues']
        },
        {
          name: 'Deployment Metrics',
          type: 'deployment_stats',
          metrics: ['deployment_frequency', 'success_rate', 'rollback_rate']
        }
      ]
    });

    // Customer Success Report Template
    this.reportTemplates.set('customerSuccess', {
      title: 'FloWorx Customer Success Report',
      sections: [
        {
          name: 'User Engagement',
          type: 'engagement_metrics',
          metrics: ['daily_active_users', 'session_duration', 'feature_usage']
        },
        {
          name: 'Onboarding Success',
          type: 'onboarding_analysis',
          metrics: ['completion_rate', 'time_to_value', 'drop_off_points']
        },
        {
          name: 'Feature Adoption',
          type: 'adoption_metrics',
          metrics: ['feature_usage_trends', 'adoption_rates', 'user_feedback']
        },
        {
          name: 'Support Insights',
          type: 'support_metrics',
          metrics: ['ticket_volume', 'resolution_time', 'satisfaction_scores']
        }
      ]
    });

    logger.info('Report templates initialized');
  }

  /**
   * Schedule automated reports
   */
  scheduleAutomatedReports() {
    for (const [stakeholder, config] of Object.entries(this.stakeholderConfigs)) {
      if (config.recipients.length > 0) {
        const task = cron.schedule(config.schedule, async () => {
          await this.generateAndSendReport(stakeholder);
        }, {
          scheduled: false,
          timezone: process.env.REPORT_TIMEZONE || 'America/New_York'
        });

        this.reportSchedules.set(stakeholder, task);
        task.start();

        logger.info(`Scheduled ${config.name} report`, {
          stakeholder,
          frequency: config.frequency,
          schedule: config.schedule,
          recipients: config.recipients.length
        });
      }
    }
  }

  /**
   * Generate and send report for stakeholder group
   */
  async generateAndSendReport(stakeholderGroup) {
    try {
      const config = this.stakeholderConfigs[stakeholderGroup];
      const template = this.reportTemplates.get(stakeholderGroup);

      if (!config || !template) {
        throw new Error(`Invalid stakeholder group: ${stakeholderGroup}`);
      }

      logger.info(`Generating ${config.name} report`, { stakeholderGroup });

      // Collect metrics data
      const metricsData = await this.collectMetricsData(config.metrics);

      // Generate report content
      const reportData = await this.generateReportContent(template, metricsData);

      // Create report in requested formats
      const reports = await this.createReportFormats(reportData, config.format);

      // Send reports to recipients
      await this.sendReports(reports, config);

      // Store report history
      await this.storeReportHistory(stakeholderGroup, reportData, reports);

      this.emit('report:generated', {
        stakeholderGroup,
        timestamp: Date.now(),
        recipients: config.recipients.length,
        formats: config.format
      });

      logger.info(`${config.name} report sent successfully`, {
        stakeholderGroup,
        recipients: config.recipients.length
      });

    } catch (error) {
      logger.error(`Failed to generate ${stakeholderGroup} report`, { error: error.message });
      this.emit('report:error', { stakeholderGroup, error: error.message });
    }
  }

  /**
   * Collect metrics data for report
   */
  async collectMetricsData(requiredMetrics) {
    const metricsData = {};

    for (const metric of requiredMetrics) {
      try {
        switch (metric) {
          case 'business_kpis':
            metricsData.businessKpis = await this.collectBusinessKPIs();
            break;
          case 'system_performance':
            metricsData.systemPerformance = await this.collectSystemPerformance();
            break;
          case 'error_rates':
            metricsData.errorRates = await this.collectErrorRates();
            break;
          case 'user_engagement':
            metricsData.userEngagement = await this.collectUserEngagement();
            break;
          case 'sla_status':
            metricsData.slaStatus = await this.collectSLAStatus();
            break;
          case 'code_quality':
            metricsData.codeQuality = await this.collectCodeQuality();
            break;
          default:
            logger.warn(`Unknown metric type: ${metric}`);
        }
      } catch (error) {
        logger.error(`Failed to collect metric: ${metric}`, { error: error.message });
        metricsData[metric] = { error: error.message };
      }
    }

    return metricsData;
  }

  /**
   * Collect business KPIs
   */
  async collectBusinessKPIs() {
    try {
      const { query } = require('../database/unified-connection');
      
      // Active users
      const activeUsersResult = await query(`
        SELECT COUNT(DISTINCT id) as count
        FROM users 
        WHERE last_login >= NOW() - INTERVAL '24 hours'
      `);

      // New signups
      const signupsResult = await query(`
        SELECT COUNT(*) as count
        FROM users 
        WHERE created_at >= NOW() - INTERVAL '24 hours'
      `);

      // Onboarding completion rate
      const onboardingResult = await query(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN onboarding_completed = true THEN 1 END) as completed
        FROM users 
        WHERE created_at >= NOW() - INTERVAL '7 days'
      `);

      // Workflow executions
      const workflowsResult = await query(`
        SELECT COUNT(*) as count
        FROM workflow_deployments 
        WHERE deployed_at >= NOW() - INTERVAL '24 hours'
      `);

      return {
        activeUsers: parseInt(activeUsersResult.rows[0].count) || 0,
        newSignups: parseInt(signupsResult.rows[0].count) || 0,
        onboardingRate: onboardingResult.rows[0].total > 0 ? 
          (onboardingResult.rows[0].completed / onboardingResult.rows[0].total) * 100 : 0,
        workflowExecutions: parseInt(workflowsResult.rows[0].count) || 0,
        timestamp: Date.now()
      };
    } catch (error) {
      logger.error('Failed to collect business KPIs', { error: error.message });
      return { error: error.message };
    }
  }

  /**
   * Collect system performance metrics
   */
  async collectSystemPerformance() {
    try {
      const realTimeMonitoringService = require('./realTimeMonitoringService');
      const metrics = realTimeMonitoringService.getMetrics();

      return {
        averageResponseTime: metrics.performance.averageResponseTime,
        peakResponseTime: metrics.performance.peakResponseTime,
        totalQueries: metrics.performance.totalQueries,
        slowQueries: metrics.performance.slowQueries,
        currentConnections: metrics.performance.currentConnections,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        timestamp: Date.now()
      };
    } catch (error) {
      logger.error('Failed to collect system performance', { error: error.message });
      return { error: error.message };
    }
  }

  /**
   * Collect error rates and analysis
   */
  async collectErrorRates() {
    try {
      const errorTrackingService = require('./errorTrackingService');
      const stats = errorTrackingService.getStats();

      return {
        totalErrors: stats.total,
        errorsByCategory: stats.byCategory,
        errorsBySeverity: stats.bySeverity,
        errorsByEndpoint: stats.byEndpoint,
        recentErrorsCount: stats.recentErrorsCount,
        timestamp: Date.now()
      };
    } catch (error) {
      logger.error('Failed to collect error rates', { error: error.message });
      return { error: error.message };
    }
  }

  /**
   * Generate report content from template and data
   */
  async generateReportContent(template, metricsData) {
    const reportContent = {
      title: template.title,
      generatedAt: new Date().toISOString(),
      sections: []
    };

    for (const section of template.sections) {
      const sectionContent = {
        name: section.name,
        type: section.type,
        data: {},
        charts: [],
        summary: ''
      };

      // Process metrics for this section
      for (const metric of section.metrics) {
        if (metricsData[metric]) {
          sectionContent.data[metric] = metricsData[metric];
        }
      }

      // Generate section summary
      sectionContent.summary = this.generateSectionSummary(section, sectionContent.data);

      reportContent.sections.push(sectionContent);
    }

    return reportContent;
  }

  /**
   * Generate section summary
   */
  generateSectionSummary(section, data) {
    switch (section.type) {
      case 'kpi_cards':
        return this.generateKPISummary(data);
      case 'performance_metrics':
        return this.generatePerformanceSummary(data);
      case 'error_breakdown':
        return this.generateErrorSummary(data);
      default:
        return 'Data collected successfully';
    }
  }

  /**
   * Generate KPI summary
   */
  generateKPISummary(data) {
    if (data.businessKpis && !data.businessKpis.error) {
      const kpis = data.businessKpis;
      return `Active Users: ${kpis.activeUsers}, New Signups: ${kpis.newSignups}, Onboarding Rate: ${kpis.onboardingRate.toFixed(1)}%, Workflow Executions: ${kpis.workflowExecutions}`;
    }
    return 'KPI data unavailable';
  }

  /**
   * Generate performance summary
   */
  generatePerformanceSummary(data) {
    if (data.systemPerformance && !data.systemPerformance.error) {
      const perf = data.systemPerformance;
      return `Avg Response Time: ${perf.averageResponseTime.toFixed(0)}ms, Total Queries: ${perf.totalQueries}, Slow Queries: ${perf.slowQueries}, Uptime: ${(perf.uptime / 3600).toFixed(1)}h`;
    }
    return 'Performance data unavailable';
  }

  /**
   * Generate error summary
   */
  generateErrorSummary(data) {
    if (data.errorRates && !data.errorRates.error) {
      const errors = data.errorRates;
      return `Total Errors: ${errors.totalErrors}, Recent Errors: ${errors.recentErrorsCount}`;
    }
    return 'Error data unavailable';
  }

  /**
   * Create report in multiple formats
   */
  async createReportFormats(reportData, formats) {
    const reports = {};

    for (const format of formats) {
      try {
        switch (format) {
          case 'email':
            reports.email = await this.createEmailReport(reportData);
            break;
          case 'pdf':
            reports.pdf = await this.createPDFReport(reportData);
            break;
          case 'slack':
            reports.slack = await this.createSlackReport(reportData);
            break;
          case 'json':
            reports.json = reportData;
            break;
        }
      } catch (error) {
        logger.error(`Failed to create ${format} report`, { error: error.message });
      }
    }

    return reports;
  }

  /**
   * Create email report
   */
  async createEmailReport(reportData) {
    let html = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
            .header { background-color: #2c3e50; color: white; padding: 20px; border-radius: 5px; }
            .section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
            .kpi { display: inline-block; margin: 10px; padding: 15px; background-color: #f8f9fa; border-radius: 5px; }
            .summary { background-color: #e8f4f8; padding: 10px; border-radius: 3px; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${reportData.title}</h1>
            <p>Generated: ${new Date(reportData.generatedAt).toLocaleString()}</p>
          </div>
    `;

    for (const section of reportData.sections) {
      html += `
        <div class="section">
          <h2>${section.name}</h2>
          <div class="summary">${section.summary}</div>
      `;

      // Add section-specific content
      if (section.type === 'kpi_cards' && section.data.businessKpis) {
        const kpis = section.data.businessKpis;
        html += `
          <div class="kpi">Active Users: <strong>${kpis.activeUsers}</strong></div>
          <div class="kpi">New Signups: <strong>${kpis.newSignups}</strong></div>
          <div class="kpi">Onboarding Rate: <strong>${kpis.onboardingRate.toFixed(1)}%</strong></div>
          <div class="kpi">Workflows: <strong>${kpis.workflowExecutions}</strong></div>
        `;
      }

      html += '</div>';
    }

    html += `
          <div style="margin-top: 30px; font-size: 12px; color: #666;">
            <p>This report was automatically generated by FloWorx Monitoring System</p>
          </div>
        </body>
      </html>
    `;

    return html;
  }

  /**
   * Create Slack report
   */
  async createSlackReport(reportData) {
    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: reportData.title
        }
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Generated: ${new Date(reportData.generatedAt).toLocaleString()}`
          }
        ]
      }
    ];

    for (const section of reportData.sections) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${section.name}*\n${section.summary}`
        }
      });

      blocks.push({ type: 'divider' });
    }

    return { blocks };
  }

  /**
   * Send reports to recipients
   */
  async sendReports(reports, config) {
    const promises = [];

    if (reports.email && config.recipients.length > 0) {
      promises.push(this.sendEmailReport(reports.email, config));
    }

    if (reports.slack) {
      promises.push(this.sendSlackReport(reports.slack, config));
    }

    await Promise.all(promises);
  }

  /**
   * Send email report
   */
  async sendEmailReport(htmlContent, config) {
    try {
      const nodemailer = require('nodemailer');
      
      const transporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_PORT === '465',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD
        }
      });

      const mailOptions = {
        from: process.env.REPORT_FROM_EMAIL || 'reports@floworx-iq.com',
        to: config.recipients.join(','),
        subject: `${config.name} - ${new Date().toLocaleDateString()}`,
        html: htmlContent
      };

      await transporter.sendMail(mailOptions);
      logger.info('Email report sent successfully', { recipients: config.recipients.length });
    } catch (error) {
      logger.error('Failed to send email report', { error: error.message });
    }
  }

  /**
   * Send Slack report
   */
  async sendSlackReport(slackContent, config) {
    try {
      const axios = require('axios');
      const webhookUrl = process.env.SLACK_REPORTS_WEBHOOK_URL;

      if (!webhookUrl) {
        logger.warn('Slack webhook URL not configured for reports');
        return;
      }

      await axios.post(webhookUrl, slackContent);
      logger.info('Slack report sent successfully');
    } catch (error) {
      logger.error('Failed to send Slack report', { error: error.message });
    }
  }

  /**
   * Get reporting service status
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      scheduledReports: Array.from(this.reportSchedules.keys()),
      reportTemplates: Array.from(this.reportTemplates.keys()),
      stakeholderGroups: Object.keys(this.stakeholderConfigs)
    };
  }

  /**
   * Shutdown reporting service
   */
  shutdown() {
    // Stop all scheduled tasks
    for (const task of this.reportSchedules.values()) {
      task.stop();
    }
    
    this.reportSchedules.clear();
    this.isInitialized = false;
    
    logger.info('Stakeholder reporting service shut down');
    this.emit('reporting:shutdown');
  }
}

// Export singleton instance
const stakeholderReportingService = new StakeholderReportingService();
module.exports = stakeholderReportingService;
