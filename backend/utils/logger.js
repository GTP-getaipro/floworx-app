const path = require('path');

const winston = require('winston');

const { format } = winston;
// ContainerMemoryMonitor removed during cleanup

/**
 * Structured logging service
 */
class Logger {
  constructor(options = {}) {
    this.options = {
      logDir: options.logDir || 'logs',
      level: options.level || 'info',
      maxFiles: options.maxFiles || '7d',
      maxSize: options.maxSize || '10m',
      enableMemoryMonitoring: options.enableMemoryMonitoring !== false,
      ...options
    };

    this.createLogger();

    // Initialize container-aware memory monitoring
    if (this.options.enableMemoryMonitoring) {
      this.initializeMemoryMonitoring();
    }
  }

  /**
   * Create Winston logger instance
   */
  createLogger() {
    const { combine, timestamp, json, errors, colorize } = format;

    // Create log directory if it doesn't exist
    const fs = require('fs');
    if (!fs.existsSync(this.options.logDir)) {
      fs.mkdirSync(this.options.logDir, { recursive: true });
    }

    // Define log formats
    const logFormat = combine(errors({ stack: true }), timestamp(), json());

    const consoleFormat = combine(colorize(), format.simple());

    // Create logger
    this.logger = winston.createLogger({
      level: this.options.level,
      format: logFormat,
      defaultMeta: { service: 'floworx-api' },
      transports: [
        // Console transport
        new winston.transports.Console({
          format: consoleFormat,
          level: 'debug'
        }),
        // Application log file
        new winston.transports.File({
          filename: path.join(this.options.logDir, 'app.log'),
          maxFiles: this.options.maxFiles,
          maxsize: this.options.maxSize
        }),
        // Error log file
        new winston.transports.File({
          filename: path.join(this.options.logDir, 'error.log'),
          level: 'error',
          maxFiles: this.options.maxFiles,
          maxsize: this.options.maxSize
        })
      ]
    });

    // Add shutdown handler
    this.handleShutdown();
  }

  /**
   * Log an info message
   */
  info(message, meta = {}) {
    this.logger.info(message, this.addContext(meta));
  }

  /**
   * Log a debug message
   */
  debug(message, meta = {}) {
    this.logger.debug(message, this.addContext(meta));
  }

  /**
   * Log a warning message
   */
  warn(message, meta = {}) {
    this.logger.warn(message, this.addContext(meta));
  }

  /**
   * Log an error message
   */
  error(message, meta = {}) {
    if (message instanceof Error) {
      meta.stack = message.stack;
      message = message.message;
    }
    this.logger.error(message, this.addContext(meta));
  }

  /**
   * Add context to log metadata
   */
  addContext(meta) {
    const context = {
      timestamp: new Date().toISOString(),
      pid: process.pid,
      ...meta
    };

    // Memory monitoring disabled - ContainerMemoryMonitor removed during cleanup
    context.memory = { status: 'monitoring_disabled' };

    return context;
  }

  /**
   * Create Express middleware for request logging
   */
  requestLogger() {
    return (req, res, next) => {
      const start = Date.now();

      // Log request
      this.info('Request started', {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        userAgent: req.get('user-agent')
      });

      // Log response
      res.on('finish', () => {
        const duration = Date.now() - start;
        const level = res.statusCode >= 400 ? 'error' : 'info';

        this[level]('Request completed', {
          method: req.method,
          url: req.originalUrl,
          status: res.statusCode,
          duration,
          contentLength: res.get('content-length')
        });
      });

      next();
    };
  }

  /**
   * Create Express error logging middleware
   */
  errorLogger() {
    return (err, req, res, next) => {
      this.error('Request error', {
        error: err.message,
        stack: err.stack,
        method: req.method,
        url: req.originalUrl,
        status: err.status || 500
      });
      next(err);
    };
  }

  /**
   * Handle graceful shutdown
   */
  handleShutdown() {
    const cleanup = async () => {
      this.info('Application shutdown initiated');

      // Close all transports
      for (const transport of this.logger.transports) {
        if (transport.close) {
          await new Promise(resolve => transport.close(resolve));
        }
      }

      process.exit(0);
    };

    process.on('SIGTERM', cleanup);
    process.on('SIGINT', cleanup);
  }

  /**
   * Initialize container-aware memory monitoring
   */
  initializeMemoryMonitoring() {
    // ContainerMemoryMonitor removed during cleanup - using basic memory monitoring
    this.memoryMonitor = {
      start: () => console.log('Memory monitoring disabled'),
      stop: () => console.log('Memory monitoring stopped'),
      getStats: () => ({ usage: 0, available: 0 }),
      getMemorySummary: () => ({ status: 'disabled', usage: { description: 'N/A' }, trend: { trend: 'stable' } }),
      on: () => {} // Mock event listener
    };

    // Memory monitoring disabled - ContainerMemoryMonitor was removed during cleanup
    this.info('Memory monitoring disabled - ContainerMemoryMonitor removed during cleanup');
  }

  /**
   * Get current memory status for health checks
   */
  getMemoryStatus() {
    return { status: 'monitoring_disabled', message: 'ContainerMemoryMonitor removed during cleanup' };
  }

  /**
   * Create a child logger with additional default metadata
   */
  child(defaultMeta) {
    return this.logger.child(defaultMeta);
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    if (this.memoryMonitor) {
      this.memoryMonitor.stopMonitoring();
    }
  }
}

// Create request logger middleware
const requestLogger = (req, res, next) => {
  // Add request ID if not exists
  req.id = req.id || req.headers['x-request-id'] || require('crypto').randomBytes(16).toString('hex');

  // Add timestamp to request
  req.startTime = Date.now();

  // Create child logger with request context
  const loggerInstance = new Logger();
  req.logger = {
    ...loggerInstance,
    info: (message, meta = {}) => loggerInstance.info(message, {
      ...meta,
      requestId: req.id,
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    }),
    error: (message, meta = {}) => loggerInstance.error(message, {
      ...meta,
      requestId: req.id,
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    }),
    warn: (message, meta = {}) => loggerInstance.warn(message, {
      ...meta,
      requestId: req.id,
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    }),
    debug: (message, meta = {}) => loggerInstance.debug(message, {
      ...meta,
      requestId: req.id,
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    })
  };

  // Log request
  req.logger.info(`Request received: ${req.method} ${req.originalUrl}`);

  // Log response
  const originalSend = res.send;
  res.send = function(body) {
    const responseTime = Date.now() - req.startTime;

    req.logger.info(`Response sent: ${res.statusCode} (${responseTime}ms)`);

    return originalSend.call(this, body);
  };

  next();
};

// Error logging middleware
const errorLogger = (err, req, res, next) => {
  const logger = req.logger || new Logger();

  logger.error('Request error', {
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip
  });

  next(err);
};

// Export singleton instance and middleware
const logger = new Logger();

module.exports = {
  logger,
  requestLogger,
  errorLogger,
  Logger
};
