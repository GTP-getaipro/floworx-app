/**
 * Comprehensive Monitoring and Alerting Setup for FloWorx
 * Implements structured logging, error tracking, performance monitoring, and alerting
 */

const winston = require('winston');
const { ElasticsearchTransport } = require('winston-elasticsearch');
const prometheus = require('prom-client');
const express = require('express');
const { Pool } = require('pg');

class MonitoringSystem {
  constructor() {
    this.metrics = {
      // HTTP metrics
      httpRequestDuration: new prometheus.Histogram({
        name: 'http_request_duration_seconds',
        help: 'Duration of HTTP requests in seconds',
        labelNames: ['method', 'route', 'status_code'],
        buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
      }),

      httpRequestTotal: new prometheus.Counter({
        name: 'http_requests_total',
        help: 'Total number of HTTP requests',
        labelNames: ['method', 'route', 'status_code']
      }),

      // Database metrics
      dbConnectionsActive: new prometheus.Gauge({
        name: 'db_connections_active',
        help: 'Number of active database connections'
      }),

      dbQueryDuration: new prometheus.Histogram({
        name: 'db_query_duration_seconds',
        help: 'Duration of database queries in seconds',
        labelNames: ['query_type', 'table'],
        buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5]
      }),

      // Authentication metrics
      authAttempts: new prometheus.Counter({
        name: 'auth_attempts_total',
        help: 'Total authentication attempts',
        labelNames: ['type', 'status']
      }),

      // Business metrics
      userRegistrations: new prometheus.Counter({
        name: 'user_registrations_total',
        help: 'Total user registrations',
        labelNames: ['provider']
      }),

      workflowExecutions: new prometheus.Counter({
        name: 'workflow_executions_total',
        help: 'Total workflow executions',
        labelNames: ['status']
      }),

      // System metrics
      memoryUsage: new prometheus.Gauge({
        name: 'nodejs_memory_usage_bytes',
        help: 'Node.js memory usage in bytes',
        labelNames: ['type']
      }),

      cpuUsage: new prometheus.Gauge({
        name: 'nodejs_cpu_usage_percent',
        help: 'Node.js CPU usage percentage'
      })
    };

    this.logger = this.setupLogger();
    this.alerting = this.setupAlerting();
    
    // Start metrics collection
    this.startMetricsCollection();
  }

  /**
   * Setup structured logging with multiple transports
   */
  setupLogger() {
    const logFormat = winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json(),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        return JSON.stringify({
          timestamp,
          level,
          message,
          ...meta,
          service: 'floworx-api',
          environment: process.env.NODE_ENV || 'development',
          version: process.env.APP_VERSION || '1.0.0',
          deployment_id: process.env.DEPLOYMENT_ID || 'unknown'
        });
      })
    );

    const transports = [
      // Console transport for development
      new winston.transports.Console({
        level: process.env.LOG_LEVEL || 'info',
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      }),

      // File transport for production
      new winston.transports.File({
        filename: '/var/log/floworx/error.log',
        level: 'error',
        format: logFormat,
        maxsize: 100 * 1024 * 1024, // 100MB
        maxFiles: 5
      }),

      new winston.transports.File({
        filename: '/var/log/floworx/combined.log',
        format: logFormat,
        maxsize: 100 * 1024 * 1024, // 100MB
        maxFiles: 10
      })
    ];

    // Add Elasticsearch transport for production
    if (process.env.ELASTICSEARCH_URL && process.env.NODE_ENV === 'production') {
      transports.push(
        new ElasticsearchTransport({
          level: 'info',
          clientOpts: {
            node: process.env.ELASTICSEARCH_URL,
            auth: {
              username: process.env.ELASTICSEARCH_USERNAME,
              password: process.env.ELASTICSEARCH_PASSWORD
            }
          },
          index: 'floworx-logs',
          format: logFormat
        })
      );
    }

    return winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: logFormat,
      transports,
      exitOnError: false
    });
  }

  /**
   * Setup alerting system
   */
  setupAlerting() {
    return {
      // Error rate threshold (errors per minute)
      errorRateThreshold: 10,
      
      // Response time threshold (milliseconds)
      responseTimeThreshold: 2000,
      
      // Database connection threshold
      dbConnectionThreshold: 15,
      
      // Memory usage threshold (bytes)
      memoryThreshold: 1024 * 1024 * 1024, // 1GB
      
      // Alert cooldown (milliseconds)
      alertCooldown: 5 * 60 * 1000, // 5 minutes
      
      lastAlerts: new Map()
    };
  }

  /**
   * Start metrics collection
   */
  startMetricsCollection() {
    // Collect default metrics
    prometheus.collectDefaultMetrics({
      prefix: 'floworx_',
      timeout: 5000
    });

    // Collect custom system metrics every 30 seconds
    setInterval(() => {
      this.collectSystemMetrics();
    }, 30000);

    // Collect database metrics every 60 seconds
    setInterval(() => {
      this.collectDatabaseMetrics();
    }, 60000);
  }

  /**
   * Collect system metrics
   */
  collectSystemMetrics() {
    const memUsage = process.memoryUsage();
    
    this.metrics.memoryUsage.set({ type: 'rss' }, memUsage.rss);
    this.metrics.memoryUsage.set({ type: 'heapTotal' }, memUsage.heapTotal);
    this.metrics.memoryUsage.set({ type: 'heapUsed' }, memUsage.heapUsed);
    this.metrics.memoryUsage.set({ type: 'external' }, memUsage.external);

    // CPU usage (simplified)
    const cpuUsage = process.cpuUsage();
    const cpuPercent = (cpuUsage.user + cpuUsage.system) / 1000000; // Convert to seconds
    this.metrics.cpuUsage.set(cpuPercent);

    // Check for alerts
    this.checkSystemAlerts(memUsage);
  }

  /**
   * Collect database metrics
   */
  async collectDatabaseMetrics() {
    try {
      if (global.databasePool) {
        const pool = global.databasePool;
        this.metrics.dbConnectionsActive.set(pool.totalCount || 0);
        
        // Check database connection alert
        if (pool.totalCount > this.alerting.dbConnectionThreshold) {
          this.sendAlert('database', 'High database connection count', {
            current: pool.totalCount,
            threshold: this.alerting.dbConnectionThreshold
          });
        }
      }
    } catch (error) {
      this.logger.error('Failed to collect database metrics', { error: error.message });
    }
  }

  /**
   * Check system alerts
   */
  checkSystemAlerts(memUsage) {
    // Memory usage alert
    if (memUsage.heapUsed > this.alerting.memoryThreshold) {
      this.sendAlert('memory', 'High memory usage detected', {
        current: memUsage.heapUsed,
        threshold: this.alerting.memoryThreshold,
        percentage: ((memUsage.heapUsed / this.alerting.memoryThreshold) * 100).toFixed(2)
      });
    }
  }

  /**
   * Send alert with cooldown
   */
  sendAlert(type, message, data = {}) {
    const alertKey = `${type}-${message}`;
    const now = Date.now();
    const lastAlert = this.alerting.lastAlerts.get(alertKey);

    // Check cooldown
    if (lastAlert && (now - lastAlert) < this.alerting.alertCooldown) {
      return;
    }

    this.alerting.lastAlerts.set(alertKey, now);

    // Log alert
    this.logger.error('ALERT: ' + message, {
      alert_type: type,
      alert_data: data,
      timestamp: new Date().toISOString()
    });

    // Send to external alerting systems
    this.sendExternalAlert(type, message, data);
  }

  /**
   * Send alert to external systems
   */
  async sendExternalAlert(type, message, data) {
    try {
      // Slack notification
      if (process.env.SLACK_WEBHOOK_URL) {
        await this.sendSlackAlert(type, message, data);
      }

      // Email notification
      if (process.env.ALERT_EMAIL) {
        await this.sendEmailAlert(type, message, data);
      }

      // PagerDuty integration
      if (process.env.PAGERDUTY_INTEGRATION_KEY) {
        await this.sendPagerDutyAlert(type, message, data);
      }
    } catch (error) {
      this.logger.error('Failed to send external alert', { error: error.message });
    }
  }

  /**
   * Send Slack alert
   */
  async sendSlackAlert(type, message, data) {
    const axios = require('axios');
    
    const payload = {
      text: `🚨 FloWorx Alert: ${message}`,
      attachments: [{
        color: 'danger',
        fields: [
          { title: 'Type', value: type, short: true },
          { title: 'Environment', value: process.env.NODE_ENV, short: true },
          { title: 'Timestamp', value: new Date().toISOString(), short: true },
          { title: 'Data', value: JSON.stringify(data, null, 2), short: false }
        ]
      }]
    };

    await axios.post(process.env.SLACK_WEBHOOK_URL, payload);
  }

  /**
   * Send email alert
   */
  async sendEmailAlert(type, message, data) {
    // Implementation depends on email service (SendGrid, SES, etc.)
    this.logger.info('Email alert would be sent', { type, message, data });
  }

  /**
   * Send PagerDuty alert
   */
  async sendPagerDutyAlert(type, message, data) {
    const axios = require('axios');
    
    const payload = {
      routing_key: process.env.PAGERDUTY_INTEGRATION_KEY,
      event_action: 'trigger',
      payload: {
        summary: `FloWorx Alert: ${message}`,
        source: 'floworx-api',
        severity: 'error',
        custom_details: data
      }
    };

    await axios.post('https://events.pagerduty.com/v2/enqueue', payload);
  }

  /**
   * Create HTTP request middleware
   */
  createHttpMiddleware() {
    return (req, res, next) => {
      const startTime = Date.now();
      
      // Track request
      this.metrics.httpRequestTotal.inc({
        method: req.method,
        route: req.route?.path || req.path,
        status_code: 'pending'
      });

      // Override res.end to capture response
      const originalEnd = res.end;
      res.end = (...args) => {
        const duration = (Date.now() - startTime) / 1000;
        
        // Update metrics
        this.metrics.httpRequestDuration.observe(
          {
            method: req.method,
            route: req.route?.path || req.path,
            status_code: res.statusCode
          },
          duration
        );

        this.metrics.httpRequestTotal.inc({
          method: req.method,
          route: req.route?.path || req.path,
          status_code: res.statusCode
        });

        // Log request
        this.logger.info('HTTP Request', {
          method: req.method,
          url: req.url,
          status: res.statusCode,
          duration: duration,
          user_agent: req.get('User-Agent'),
          ip: req.ip,
          user_id: req.user?.id
        });

        // Check for slow requests
        if (duration * 1000 > this.alerting.responseTimeThreshold) {
          this.sendAlert('performance', 'Slow HTTP request detected', {
            method: req.method,
            url: req.url,
            duration: duration * 1000,
            threshold: this.alerting.responseTimeThreshold
          });
        }

        originalEnd.apply(res, args);
      };

      next();
    };
  }

  /**
   * Create database query middleware
   */
  createDatabaseMiddleware() {
    return {
      beforeQuery: (query, params) => {
        return {
          startTime: Date.now(),
          query,
          params
        };
      },

      afterQuery: (context, result, error) => {
        const duration = (Date.now() - context.startTime) / 1000;
        const queryType = context.query.split(' ')[0].toUpperCase();
        const table = this.extractTableName(context.query);

        this.metrics.dbQueryDuration.observe(
          { query_type: queryType, table },
          duration
        );

        if (error) {
          this.logger.error('Database query failed', {
            query: context.query,
            params: context.params,
            duration,
            error: error.message
          });
        } else {
          this.logger.debug('Database query executed', {
            query_type: queryType,
            table,
            duration,
            rows_affected: result?.rowCount
          });
        }
      }
    };
  }

  /**
   * Extract table name from SQL query
   */
  extractTableName(query) {
    const match = query.match(/(?:FROM|INTO|UPDATE|JOIN)\s+([a-zA-Z_][a-zA-Z0-9_]*)/i);
    return match ? match[1] : 'unknown';
  }

  /**
   * Track authentication events
   */
  trackAuth(type, status, metadata = {}) {
    this.metrics.authAttempts.inc({ type, status });
    
    this.logger.info('Authentication event', {
      auth_type: type,
      auth_status: status,
      ...metadata
    });

    if (status === 'failed') {
      this.sendAlert('security', `Failed ${type} attempt`, metadata);
    }
  }

  /**
   * Track business events
   */
  trackBusinessEvent(event, data = {}) {
    switch (event) {
      case 'user_registration':
        this.metrics.userRegistrations.inc({ provider: data.provider || 'unknown' });
        break;
      case 'workflow_execution':
        this.metrics.workflowExecutions.inc({ status: data.status || 'unknown' });
        break;
    }

    this.logger.info('Business event', {
      event_type: event,
      event_data: data
    });
  }

  /**
   * Get metrics endpoint
   */
  getMetricsEndpoint() {
    const router = express.Router();
    
    router.get('/metrics', async (req, res) => {
      try {
        res.set('Content-Type', prometheus.register.contentType);
        res.end(await prometheus.register.metrics());
      } catch (error) {
        res.status(500).end(error.message);
      }
    });

    return router;
  }

  /**
   * Get health check endpoint with detailed status
   */
  getHealthEndpoint() {
    const router = express.Router();
    
    router.get('/health/detailed', async (req, res) => {
      try {
        const health = {
          status: 'ok',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          cpu: process.cpuUsage(),
          environment: process.env.NODE_ENV,
          version: process.env.APP_VERSION || '1.0.0',
          deployment_id: process.env.DEPLOYMENT_ID || 'unknown'
        };

        // Add database health
        if (global.databasePool) {
          health.database = {
            total_connections: global.databasePool.totalCount,
            idle_connections: global.databasePool.idleCount,
            waiting_connections: global.databasePool.waitingCount
          };
        }

        res.json(health);
      } catch (error) {
        res.status(500).json({
          status: 'error',
          error: error.message
        });
      }
    });

    return router;
  }
}

module.exports = MonitoringSystem;
