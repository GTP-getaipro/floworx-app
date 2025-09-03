const winston = require('winston');
const path = require('path');
const { format } = winston;

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
      ...options
    };

    this.createLogger();
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
    return {
      timestamp: new Date().toISOString(),
      pid: process.pid,
      ...meta
    };
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
   * Create a child logger with additional default metadata
   */
  child(defaultMeta) {
    return this.logger.child(defaultMeta);
  }
}

// Export singleton instance
const logger = new Logger();
module.exports = logger;
