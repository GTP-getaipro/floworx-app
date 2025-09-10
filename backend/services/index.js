const ErrorMonitor = require('../utils/ErrorMonitor');
const PerformanceMonitor = require('../utils/PerformanceMonitor');

const CacheService = require('./cacheService');
const ValidationService = require('./ValidationService');

/**
 * Service container class
 */
class Services {
  constructor(config = {}) {
    this.services = new Map();
    this.config = config;
  }

  /**
   * Initialize all services
   */
  async initialize() {
    // Initialize cache service
    this.register('cache', new CacheService(this.config.cache));

    // Initialize validation service
    this.register('validation', new ValidationService());

    // Initialize performance monitor
    const perfMonitor = new PerformanceMonitor(this.config.performance);
    this.register('performance', perfMonitor);
    perfMonitor.start();

    // Initialize error monitor
    const errorMonitor = new ErrorMonitor(this.config.errorMonitor);
    await errorMonitor.initialize();
    this.register('errorMonitor', errorMonitor);

    return this;
  }

  /**
   * Register a service
   */
  register(name, service) {
    this.services.set(name, service);
    return this;
  }

  /**
   * Get a service by name
   */
  get(name) {
    if (!this.services.has(name)) {
      throw new Error(`Service '${name}' not found`);
    }
    return this.services.get(name);
  }

  /**
   * Check if service exists
   */
  has(name) {
    return this.services.has(name);
  }

  /**
   * Get all service instances
   */
  getAll() {
    return Object.fromEntries(this.services);
  }

  /**
   * Cleanup services on shutdown
   */
  async cleanup() {
    const perfMonitor = this.get('performance');
    if (perfMonitor) {
      perfMonitor.stop();
    }

    const cache = this.get('cache');
    if (cache) {
      cache.clear();
    }

    this.services.clear();
  }
}

// Export singleton instance
const services = new Services();
module.exports = services;

// Export individual services for direct import
module.exports.CacheService = CacheService;
module.exports.ValidationService = ValidationService;
module.exports.PerformanceMonitor = PerformanceMonitor;
module.exports.ErrorMonitor = ErrorMonitor;
