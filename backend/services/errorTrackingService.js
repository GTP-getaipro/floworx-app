/**
 * Comprehensive Error Tracking Service
 * Centralized error logging, categorization, and alerting system
 */

const EventEmitter = require('events');
const fs = require('fs').promises;
const path = require('path');

const { logger } = require('../utils/logger');

class ErrorTrackingService extends EventEmitter {
  constructor() {
    super();
    this.errors = new Map();
    this.errorStats = {
      total: 0,
      byCategory: new Map(),
      bySeverity: new Map(),
      byEndpoint: new Map(),
      byUser: new Map(),
      recentErrors: [],
      trends: {
        hourly: new Array(24).fill(0),
        daily: new Array(7).fill(0)
      }
    };

    this.config = {
      maxRecentErrors: 1000,
      maxErrorsPerType: 100,
      alertThresholds: {
        errorRate: 0.05,        // 5% error rate
        criticalErrors: 5,      // 5 critical errors in 10 minutes
        errorSpike: 10          // 10 errors in 1 minute
      },
      retentionPeriod: 7 * 24 * 60 * 60 * 1000, // 7 days
      logToFile: true,
      logDirectory: path.join(process.cwd(), 'logs', 'errors')
    };

    this.alertCooldowns = new Map();
    this.isInitialized = false;
    
    this.initialize();
  }

  /**
   * Initialize error tracking service
   */
  async initialize() {
    if (this.isInitialized) {return;}

    try {
      // Create log directory if it doesn't exist
      if (this.config.logToFile) {
        await fs.mkdir(this.config.logDirectory, { recursive: true });
      }

      // Start cleanup interval
      setInterval(() => {
        this.cleanupOldErrors();
        this.updateTrends();
      }, 60 * 60 * 1000); // Every hour

      // Start alert checking
      setInterval(() => {
        this.checkAlerts();
      }, 60 * 1000); // Every minute

      this.isInitialized = true;
      logger.info('Error tracking service initialized');
      this.emit('initialized');

    } catch (error) {
      logger.error('Failed to initialize error tracking service', { error: error.message });
    }
  }

  /**
   * Track an error
   */
  async trackError(error, context = {}) {
    try {
      const errorData = this.processError(error, context);
      
      // Store error
      this.storeError(errorData);
      
      // Update statistics
      this.updateStats(errorData);
      
      // Log to file if enabled
      if (this.config.logToFile) {
        await this.logToFile(errorData);
      }
      
      // Emit event
      this.emit('error:tracked', errorData);
      
      // Check for immediate alerts
      this.checkImmediateAlerts(errorData);
      
      return errorData.id;

    } catch (trackingError) {
      // Don't let error tracking errors break the application
      logger.error('Error tracking failed', { 
        originalError: error.message,
        trackingError: trackingError.message 
      });
    }
  }

  /**
   * Process error into standardized format
   */
  processError(error, context) {
    const now = Date.now();
    const errorId = this.generateErrorId();

    // Determine error category
    const category = this.categorizeError(error, context);
    
    // Determine severity
    const severity = this.determineSeverity(error, context, category);

    // Extract stack trace
    const stackTrace = this.extractStackTrace(error);

    // Get user context
    const userContext = this.extractUserContext(context);

    // Get request context
    const requestContext = this.extractRequestContext(context);

    return {
      id: errorId,
      timestamp: now,
      message: error.message || 'Unknown error',
      name: error.name || 'Error',
      category,
      severity,
      stackTrace,
      userContext,
      requestContext,
      environment: process.env.NODE_ENV || 'development',
      version: process.env.APP_VERSION || '1.0.0',
      fingerprint: this.generateFingerprint(error, category),
      metadata: {
        ...context,
        nodeVersion: process.version,
        platform: process.platform,
        memory: process.memoryUsage(),
        uptime: process.uptime()
      }
    };
  }

  /**
   * Categorize error type
   */
  categorizeError(error, context) {
    const message = error.message?.toLowerCase() || '';
    const name = error.name?.toLowerCase() || '';
    const endpoint = context.endpoint?.toLowerCase() || '';

    // Database errors
    if (name.includes('database') || message.includes('connection') || 
        message.includes('query') || message.includes('postgres')) {
      return 'database';
    }

    // Authentication errors
    if (name.includes('auth') || message.includes('token') || 
        message.includes('unauthorized') || endpoint.includes('auth')) {
      return 'authentication';
    }

    // Validation errors
    if (name.includes('validation') || message.includes('invalid') || 
        message.includes('required') || message.includes('format')) {
      return 'validation';
    }

    // Network errors
    if (message.includes('network') || message.includes('timeout') || 
        message.includes('connection refused') || message.includes('enotfound')) {
      return 'network';
    }

    // External service errors
    if (message.includes('oauth') || message.includes('google') || 
        message.includes('api') || endpoint.includes('oauth')) {
      return 'external_service';
    }

    // Business logic errors
    if (endpoint.includes('onboarding') || endpoint.includes('workflow') || 
        endpoint.includes('analytics')) {
      return 'business_logic';
    }

    // System errors
    if (message.includes('memory') || message.includes('disk') || 
        message.includes('cpu') || name.includes('system')) {
      return 'system';
    }

    return 'unknown';
  }

  /**
   * Determine error severity
   */
  determineSeverity(error, context, category) {
    const message = error.message?.toLowerCase() || '';
    const statusCode = context.statusCode || 500;

    // Critical errors
    if (category === 'system' || message.includes('critical') || 
        message.includes('fatal') || statusCode >= 500) {
      return 'critical';
    }

    // High severity
    if (category === 'database' || category === 'authentication' || 
        message.includes('security') || statusCode === 401 || statusCode === 403) {
      return 'high';
    }

    // Medium severity
    if (category === 'external_service' || category === 'business_logic' || 
        statusCode >= 400) {
      return 'medium';
    }

    // Low severity
    if (category === 'validation' || statusCode < 400) {
      return 'low';
    }

    return 'medium';
  }

  /**
   * Extract stack trace
   */
  extractStackTrace(error) {
    if (!error.stack) {return null;}

    return error.stack
      .split('\n')
      .slice(0, 20) // Limit to 20 lines
      .map(line => line.trim())
      .filter(line => line.length > 0);
  }

  /**
   * Extract user context
   */
  extractUserContext(context) {
    const user = context.user || context.req?.user;
    if (!user) {return null;}

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      isAuthenticated: true
    };
  }

  /**
   * Extract request context
   */
  extractRequestContext(context) {
    const req = context.req;
    if (!req) {return null;}

    return {
      method: req.method,
      url: req.url,
      endpoint: context.endpoint || req.route?.path,
      userAgent: req.headers?.['user-agent'],
      ip: req.ip || req.connection?.remoteAddress,
      headers: this.sanitizeHeaders(req.headers),
      params: req.params,
      query: req.query,
      body: this.sanitizeBody(req.body)
    };
  }

  /**
   * Sanitize headers (remove sensitive data)
   */
  sanitizeHeaders(headers) {
    if (!headers) {return null;}

    const sanitized = { ...headers };
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
    
    sensitiveHeaders.forEach(header => {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  /**
   * Sanitize request body (remove sensitive data)
   */
  sanitizeBody(body) {
    if (!body || typeof body !== 'object') {return body;}

    const sanitized = { ...body };
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth'];
    
    Object.keys(sanitized).forEach(key => {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
        sanitized[key] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  /**
   * Generate error fingerprint for grouping
   */
  generateFingerprint(error, category) {
    const message = error.message || '';
    const name = error.name || '';
    const stack = error.stack || '';
    
    // Extract the first meaningful line from stack trace
    const stackLine = stack.split('\n')[1] || '';
    
    const fingerprintData = `${category}:${name}:${message}:${stackLine}`;
    
    return require('crypto')
      .createHash('md5')
      .update(fingerprintData)
      .digest('hex')
      .substring(0, 12);
  }

  /**
   * Generate unique error ID
   */
  generateErrorId() {
    return `err_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  /**
   * Store error in memory
   */
  storeError(errorData) {
    // Group by fingerprint
    if (!this.errors.has(errorData.fingerprint)) {
      this.errors.set(errorData.fingerprint, {
        fingerprint: errorData.fingerprint,
        firstSeen: errorData.timestamp,
        lastSeen: errorData.timestamp,
        count: 0,
        category: errorData.category,
        severity: errorData.severity,
        message: errorData.message,
        occurrences: []
      });
    }

    const errorGroup = this.errors.get(errorData.fingerprint);
    errorGroup.lastSeen = errorData.timestamp;
    errorGroup.count++;
    
    // Store occurrence (limit to prevent memory issues)
    errorGroup.occurrences.push(errorData);
    if (errorGroup.occurrences.length > this.config.maxErrorsPerType) {
      errorGroup.occurrences = errorGroup.occurrences.slice(-this.config.maxErrorsPerType);
    }

    // Add to recent errors
    this.errorStats.recentErrors.unshift(errorData);
    if (this.errorStats.recentErrors.length > this.config.maxRecentErrors) {
      this.errorStats.recentErrors = this.errorStats.recentErrors.slice(0, this.config.maxRecentErrors);
    }
  }

  /**
   * Update error statistics
   */
  updateStats(errorData) {
    this.errorStats.total++;

    // Update category stats
    const categoryCount = this.errorStats.byCategory.get(errorData.category) || 0;
    this.errorStats.byCategory.set(errorData.category, categoryCount + 1);

    // Update severity stats
    const severityCount = this.errorStats.bySeverity.get(errorData.severity) || 0;
    this.errorStats.bySeverity.set(errorData.severity, severityCount + 1);

    // Update endpoint stats
    if (errorData.requestContext?.endpoint) {
      const endpointCount = this.errorStats.byEndpoint.get(errorData.requestContext.endpoint) || 0;
      this.errorStats.byEndpoint.set(errorData.requestContext.endpoint, endpointCount + 1);
    }

    // Update user stats
    if (errorData.userContext?.id) {
      const userCount = this.errorStats.byUser.get(errorData.userContext.id) || 0;
      this.errorStats.byUser.set(errorData.userContext.id, userCount + 1);
    }

    // Update hourly trend
    const hour = new Date().getHours();
    this.errorStats.trends.hourly[hour]++;
  }

  /**
   * Log error to file
   */
  async logToFile(errorData) {
    try {
      const date = new Date().toISOString().split('T')[0];
      const filename = `errors-${date}.jsonl`;
      const filepath = path.join(this.config.logDirectory, filename);
      
      const logLine = JSON.stringify(errorData) + '\n';
      await fs.appendFile(filepath, logLine);
      
    } catch (error) {
      logger.error('Failed to log error to file', { error: error.message });
    }
  }

  /**
   * Check for immediate alerts
   */
  checkImmediateAlerts(errorData) {
    // Critical error alert
    if (errorData.severity === 'critical') {
      this.createAlert('critical_error', {
        message: `Critical error detected: ${errorData.message}`,
        errorId: errorData.id,
        category: errorData.category,
        endpoint: errorData.requestContext?.endpoint
      });
    }

    // Error spike detection
    const recentErrors = this.errorStats.recentErrors.filter(
      err => Date.now() - err.timestamp < 60 * 1000 // Last minute
    );

    if (recentErrors.length >= this.config.alertThresholds.errorSpike) {
      this.createAlert('error_spike', {
        message: `Error spike detected: ${recentErrors.length} errors in 1 minute`,
        errorCount: recentErrors.length,
        timeWindow: '1 minute'
      });
    }
  }

  /**
   * Check for periodic alerts
   */
  checkAlerts() {
    const now = Date.now();
    const tenMinutesAgo = now - 10 * 60 * 1000;

    // Check critical error threshold
    const recentCriticalErrors = this.errorStats.recentErrors.filter(
      err => err.severity === 'critical' && err.timestamp > tenMinutesAgo
    );

    if (recentCriticalErrors.length >= this.config.alertThresholds.criticalErrors) {
      this.createAlert('critical_error_threshold', {
        message: `High number of critical errors: ${recentCriticalErrors.length} in 10 minutes`,
        errorCount: recentCriticalErrors.length,
        timeWindow: '10 minutes'
      });
    }

    // Check error rate (if we have request metrics)
    // This would need integration with request tracking
  }

  /**
   * Create alert with cooldown
   */
  createAlert(type, data) {
    const now = Date.now();
    const cooldownKey = `${type}:${data.category || 'global'}`;
    const cooldownPeriod = 15 * 60 * 1000; // 15 minutes

    // Check cooldown
    if (this.alertCooldowns.has(cooldownKey)) {
      const lastAlert = this.alertCooldowns.get(cooldownKey);
      if (now - lastAlert < cooldownPeriod) {
        return; // Skip alert due to cooldown
      }
    }

    const alert = {
      id: require('crypto').randomBytes(8).toString('hex'),
      type,
      timestamp: now,
      ...data
    };

    this.alertCooldowns.set(cooldownKey, now);

    // Log alert
    logger.error('Error tracking alert', alert);

    // Emit alert event
    this.emit('alert:created', alert);

    return alert;
  }

  /**
   * Clean up old errors
   */
  cleanupOldErrors() {
    const now = Date.now();
    const cutoff = now - this.config.retentionPeriod;

    // Clean up recent errors
    this.errorStats.recentErrors = this.errorStats.recentErrors.filter(
      err => err.timestamp > cutoff
    );

    // Clean up error groups
    for (const [fingerprint, errorGroup] of this.errors) {
      errorGroup.occurrences = errorGroup.occurrences.filter(
        err => err.timestamp > cutoff
      );

      if (errorGroup.occurrences.length === 0) {
        this.errors.delete(fingerprint);
      }
    }

    // Clean up alert cooldowns
    for (const [key, timestamp] of this.alertCooldowns) {
      if (now - timestamp > 60 * 60 * 1000) { // 1 hour
        this.alertCooldowns.delete(key);
      }
    }
  }

  /**
   * Update trends
   */
  updateTrends() {
    // Shift daily trend
    this.errorStats.trends.daily.shift();
    this.errorStats.trends.daily.push(this.errorStats.trends.hourly.reduce((a, b) => a + b, 0));

    // Reset hourly trend
    this.errorStats.trends.hourly.fill(0);
  }

  /**
   * Get error statistics
   */
  getStats() {
    return {
      total: this.errorStats.total,
      byCategory: Object.fromEntries(this.errorStats.byCategory),
      bySeverity: Object.fromEntries(this.errorStats.bySeverity),
      byEndpoint: Object.fromEntries(this.errorStats.byEndpoint),
      byUser: Object.fromEntries(this.errorStats.byUser),
      trends: this.errorStats.trends,
      recentErrorsCount: this.errorStats.recentErrors.length,
      errorGroupsCount: this.errors.size
    };
  }

  /**
   * Get error groups
   */
  getErrorGroups(limit = 50, sortBy = 'lastSeen') {
    const groups = Array.from(this.errors.values());
    
    groups.sort((a, b) => {
      if (sortBy === 'count') {return b.count - a.count;}
      if (sortBy === 'firstSeen') {return b.firstSeen - a.firstSeen;}
      return b.lastSeen - a.lastSeen; // default: lastSeen
    });

    return groups.slice(0, limit);
  }

  /**
   * Get recent errors
   */
  getRecentErrors(limit = 100) {
    return this.errorStats.recentErrors.slice(0, limit);
  }

  /**
   * Get error by ID
   */
  getErrorById(errorId) {
    for (const errorGroup of this.errors.values()) {
      const error = errorGroup.occurrences.find(err => err.id === errorId);
      if (error) {return error;}
    }
    return null;
  }

  /**
   * Search errors
   */
  searchErrors(query, filters = {}) {
    const results = [];
    const searchTerm = query.toLowerCase();

    for (const errorGroup of this.errors.values()) {
      // Apply filters
      if (filters.category && errorGroup.category !== filters.category) {continue;}
      if (filters.severity && errorGroup.severity !== filters.severity) {continue;}
      if (filters.startDate && errorGroup.lastSeen < filters.startDate) {continue;}
      if (filters.endDate && errorGroup.firstSeen > filters.endDate) {continue;}

      // Search in message and stack trace
      const matchingOccurrences = errorGroup.occurrences.filter(err => {
        return err.message.toLowerCase().includes(searchTerm) ||
               err.stackTrace?.some(line => line.toLowerCase().includes(searchTerm)) ||
               err.requestContext?.endpoint?.toLowerCase().includes(searchTerm);
      });

      if (matchingOccurrences.length > 0) {
        results.push({
          ...errorGroup,
          matchingOccurrences
        });
      }
    }

    return results;
  }
}

// Export singleton instance
const errorTrackingService = new ErrorTrackingService();
module.exports = errorTrackingService;
