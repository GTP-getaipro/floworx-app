/**
 * Async Wrapper Utility
 * Wraps async route handlers to catch errors and pass them to error middleware
 */

/**
 * Wraps an async function to catch errors and pass them to next()
 * @param {Function} fn - The async function to wrap
 * @returns {Function} - Express middleware function
 */
const asyncWrapper = (fn) => {
  return (req, res, next) => {
    // Execute the async function and catch any errors
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Wraps multiple async middleware functions
 * @param {...Function} middlewares - Array of async middleware functions
 * @returns {Array} - Array of wrapped middleware functions
 */
const asyncWrapperMultiple = (...middlewares) => {
  return middlewares.map(middleware => asyncWrapper(middleware));
};

/**
 * Creates a wrapped route handler with validation
 * @param {Object} options - Configuration options
 * @param {Object} options.validation - Joi validation schemas
 * @param {Object} options.validation.body - Body validation schema
 * @param {Object} options.validation.params - Params validation schema
 * @param {Object} options.validation.query - Query validation schema
 * @param {Function} options.handler - The async route handler
 * @param {Array} options.middleware - Additional middleware to run before handler
 * @returns {Array} - Array of middleware functions
 */
const createRoute = (options) => {
  const { validation, handler, middleware = [] } = options;
  const middlewares = [];

  // Add validation middleware if provided
  if (validation) {
    const validateRequest = require('./validateRequest');
    middlewares.push(validateRequest(validation));
  }

  // Add custom middleware
  if (middleware.length > 0) {
    middlewares.push(...middleware);
  }

  // Add the main handler
  middlewares.push(asyncWrapper(handler));

  return middlewares;
};

/**
 * Wraps a controller class to automatically wrap all async methods
 * @param {Class} ControllerClass - The controller class to wrap
 * @returns {Class} - Wrapped controller class
 */
const wrapController = (ControllerClass) => {
  const prototype = ControllerClass.prototype;
  const methodNames = Object.getOwnPropertyNames(prototype);

  methodNames.forEach(methodName => {
    if (methodName !== 'constructor' && typeof prototype[methodName] === 'function') {
      const originalMethod = prototype[methodName];
      
      // Check if method is async or returns a Promise
      if (originalMethod.constructor.name === 'AsyncFunction' || 
          (originalMethod.toString().includes('Promise') || originalMethod.toString().includes('await'))) {
        
        prototype[methodName] = function(...args) {
          const result = originalMethod.apply(this, args);
          
          // If this looks like an Express middleware (3 args with next)
          if (args.length === 3 && typeof args[2] === 'function') {
            const [req, res, next] = args;
            return Promise.resolve(result).catch(next);
          }
          
          return result;
        };
      }
    }
  });

  return ControllerClass;
};

/**
 * Higher-order function to create async route handlers with error handling
 * @param {Function} handler - The async route handler
 * @param {Object} options - Additional options
 * @param {boolean} options.logErrors - Whether to log errors (default: true)
 * @param {Function} options.onError - Custom error handler
 * @returns {Function} - Wrapped Express middleware
 */
const safeAsync = (handler, options = {}) => {
  const { logErrors = true, onError } = options;

  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (error) {
      // Log error if enabled
      if (logErrors) {
        console.error(`Error in ${handler.name || 'anonymous handler'}:`, {
          error: error.message,
          stack: error.stack,
          url: req.url,
          method: req.method,
          userId: req.user?.id,
          timestamp: new Date().toISOString()
        });
      }

      // Call custom error handler if provided
      if (onError && typeof onError === 'function') {
        try {
          await onError(error, req, res, next);
          return;
        } catch (onErrorError) {
          console.error('Error in custom error handler:', onErrorError);
        }
      }

      // Pass error to Express error handling middleware
      next(error);
    }
  };
};

/**
 * Wraps service methods to handle errors consistently
 * @param {Object} service - Service object with methods to wrap
 * @param {Array} methods - Array of method names to wrap (optional, wraps all if not provided)
 * @returns {Object} - Service object with wrapped methods
 */
const wrapService = (service, methods = null) => {
  const methodsToWrap = methods || Object.getOwnPropertyNames(Object.getPrototypeOf(service))
    .filter(name => name !== 'constructor' && typeof service[name] === 'function');

  methodsToWrap.forEach(methodName => {
    const originalMethod = service[methodName];
    
    service[methodName] = async function(...args) {
      try {
        return await originalMethod.apply(this, args);
      } catch (error) {
        // Add context to error
        error.service = service.constructor.name;
        error.method = methodName;
        error.timestamp = new Date().toISOString();
        
        throw error;
      }
    };
  });

  return service;
};

module.exports = {
  asyncWrapper,
  asyncWrapperMultiple,
  createRoute,
  wrapController,
  safeAsync,
  wrapService
};
