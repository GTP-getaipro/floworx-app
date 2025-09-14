// Circuit Breaker Pattern Implementation
// Prevents cascading failures by temporarily disabling failing operations

class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 30000; // 30 seconds
    this.failureCount = 0;
    this.isOpen = false;
    this.lastFailureTime = null;
    this.logger = options.logger || console;
    this.name = options.name || 'CircuitBreaker';
  }

  async execute(operation, fallback) {
    if (this.isOpen) {
      // Check if circuit should be reset
      if (Date.now() - this.lastFailureTime >= this.resetTimeout) {
        this.logger.info(`${this.name}: Circuit breaker reset attempt`);
        this.isOpen = false;
        this.failureCount = 0;
      } else {
        this.logger.warn(`${this.name}: Circuit breaker open, using fallback`);
        if (fallback) {
          return fallback();
        }
        throw new Error(`${this.name}: Circuit breaker is open`);
      }
    }

    try {
      const result = await operation();
      this.success();
      return result;
    } catch (error) {
      return this.failure(error, fallback);
    }
  }

  success() {
    if (this.failureCount > 0) {
      this.logger.info(`${this.name}: Circuit breaker success, resetting failure count`);
    }
    this.failureCount = 0;
    this.isOpen = false;
  }

  failure(error, fallback) {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    this.logger.warn(`${this.name}: Circuit breaker failure ${this.failureCount}/${this.failureThreshold}`, {
      error: error.message
    });

    if (this.failureCount >= this.failureThreshold) {
      this.isOpen = true;
      this.logger.error(`${this.name}: Circuit breaker opened due to repeated failures`, { 
        failureCount: this.failureCount,
        error: error.message
      });
    }

    if (fallback) {
      return fallback(error);
    }
    throw error;
  }

  getStatus() {
    return {
      name: this.name,
      isOpen: this.isOpen,
      failureCount: this.failureCount,
      failureThreshold: this.failureThreshold,
      lastFailureTime: this.lastFailureTime,
      resetTimeout: this.resetTimeout
    };
  }
}

// Create circuit breakers for different operations
const databaseCircuitBreaker = new CircuitBreaker({
  name: 'Database',
  failureThreshold: 3,
  resetTimeout: 30000,
  logger: require('./logger')
});

const authCircuitBreaker = new CircuitBreaker({
  name: 'Authentication',
  failureThreshold: 5,
  resetTimeout: 60000,
  logger: require('./logger')
});

module.exports = {
  CircuitBreaker,
  databaseCircuitBreaker,
  authCircuitBreaker
};
