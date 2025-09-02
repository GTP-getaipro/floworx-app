/**
 * FloWorx Shared Utilities Module
 * Common utilities used across frontend and backend
 */

// Re-export all utility modules for easy access
module.exports = {
  // Date and time utilities
  ...require('./dateTime'),
  
  // Formatting utilities
  ...require('./formatting'),
  
  // API utilities
  ...require('./api'),
  
  // Validation utilities
  ...require('./validation'),
  
  // String utilities
  ...require('./string'),
  
  // Object utilities
  ...require('./object'),
  
  // Array utilities
  ...require('./array'),
  
  // Constants
  ...require('./constants'),
  
  // Type checking utilities
  ...require('./types'),
  
  // Error utilities
  ...require('./errors'),
  
  // Security utilities
  ...require('./security')
};
