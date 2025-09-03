const EventEmitter = require('events');
const fs = require('fs').promises;
const path = require('path');

class ErrorMonitor extends EventEmitter {
  constructor(options = {}) {
    super();
    this.options = {
      logDirectory: options.logDirectory || 'logs',
      maxLogSize: options.maxLogSize || 10 * 1024 * 1024, // 10MB
      maxLogFiles: options.maxLogFiles || 5,
      errorThreshold: options.errorThreshold || 10, // Errors per minute threshold
      ...options
    };

    this.errors = new Map();
    this.errorCounts = new Map();
    this.lastRotation = Date.now();
  }

  /**
   * Initialize error monitoring
   */
  async initialize() {
    try {
      await fs.mkdir(this.options.logDirectory, { recursive: true });
      this.startErrorTracking();
    } catch (error) {
      console.error('Failed to initialize error monitor:', error);
      throw error;
    }
  }

  /**
   * Start tracking errors
   */
  startErrorTracking() {
    // Reset error counts every minute
    setInterval(() => {
      const now = Date.now();
      const oneMinuteAgo = now - 60000;

      // Check error thresholds
      for (const [path, errors] of this.errors) {
        const recentErrors = errors.filter(e => e.timestamp > oneMinuteAgo);

        if (recentErrors.length >= this.options.errorThreshold) {
          this.emit('error-threshold-exceeded', {
            path,
            count: recentErrors.length,
            errors: recentErrors
          });
        }
      }

      // Clear old errors
      for (const [path, errors] of this.errors) {
        this.errors.set(
          path,
          errors.filter(e => e.timestamp > oneMinuteAgo)
        );
      }

      // Reset counts
      this.errorCounts.clear();
    }, 60000);

    // Rotate logs daily
    const rotationInterval = 24 * 60 * 60 * 1000; // 24 hours
    setInterval(() => this.rotateLogs(), rotationInterval);
  }

  /**
   * Track an error
   */
  trackError(error, req) {
    const timestamp = Date.now();
    const path = req?.path || 'unknown';

    // Store error details
    const errorInfo = {
      message: error.message,
      stack: error.stack,
      status: error.status || 500,
      path,
      method: req?.method,
      timestamp,
      headers: req?.headers,
      query: req?.query,
      body: req?.body,
      user: req?.user?.id
    };

    // Update error tracking
    const pathErrors = this.errors.get(path) || [];
    pathErrors.push(errorInfo);
    this.errors.set(path, pathErrors);

    // Update error count
    const count = (this.errorCounts.get(path) || 0) + 1;
    this.errorCounts.set(path, count);

    // Emit error event
    this.emit('error', errorInfo);

    // Log error
    this.logError(errorInfo);

    return errorInfo;
  }

  /**
   * Log error to file
   */
  async logError(errorInfo) {
    try {
      const logFile = path.join(this.options.logDirectory, 'error.log');
      const logEntry =
        JSON.stringify({
          ...errorInfo,
          timestamp: new Date(errorInfo.timestamp).toISOString()
        }) + '\n';

      await fs.appendFile(logFile, logEntry);

      // Check log size and rotate if needed
      const stats = await fs.stat(logFile);
      if (stats.size > this.options.maxLogSize) {
        await this.rotateLogs();
      }
    } catch (error) {
      console.error('Failed to log error:', error);
    }
  }

  /**
   * Rotate log files
   */
  async rotateLogs() {
    try {
      const logFile = path.join(this.options.logDirectory, 'error.log');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

      // Move current log to archived log
      const archivedLog = path.join(this.options.logDirectory, `error-${timestamp}.log`);

      await fs.rename(logFile, archivedLog);

      // Clean up old log files
      const files = await fs.readdir(this.options.logDirectory);
      const logFiles = files
        .filter(f => f.startsWith('error-') && f.endsWith('.log'))
        .sort()
        .reverse();

      // Remove excess log files
      if (logFiles.length > this.options.maxLogFiles) {
        const filesToRemove = logFiles.slice(this.options.maxLogFiles);
        await Promise.all(filesToRemove.map(file => fs.unlink(path.join(this.options.logDirectory, file))));
      }

      this.lastRotation = Date.now();
      this.emit('logs-rotated');
    } catch (error) {
      console.error('Failed to rotate logs:', error);
    }
  }

  /**
   * Get error statistics
   */
  getStats() {
    const now = Date.now();
    const stats = {
      totalErrors: 0,
      pathStats: {},
      recentErrors: []
    };

    // Calculate stats for each path
    for (const [path, errors] of this.errors) {
      const pathStats = {
        total: errors.length,
        last24h: errors.filter(e => e.timestamp > now - 24 * 60 * 60 * 1000).length,
        lastHour: errors.filter(e => e.timestamp > now - 60 * 60 * 1000).length,
        lastMinute: errors.filter(e => e.timestamp > now - 60 * 1000).length
      };

      stats.pathStats[path] = pathStats;
      stats.totalErrors += errors.length;

      // Add recent errors
      const recentErrors = errors
        .filter(e => e.timestamp > now - 60 * 60 * 1000) // Last hour
        .slice(-10); // Last 10 errors
      stats.recentErrors.push(...recentErrors);
    }

    // Sort recent errors by timestamp
    stats.recentErrors.sort((a, b) => b.timestamp - a.timestamp);

    return stats;
  }

  /**
   * Reset error tracking
   */
  reset() {
    this.errors.clear();
    this.errorCounts.clear();
    this.emit('reset');
  }
}

module.exports = ErrorMonitor;
