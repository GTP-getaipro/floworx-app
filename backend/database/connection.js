/**
 * Database Connection Module
 * Simple wrapper around unified-connection for backward compatibility
 */

const { databaseManager, pool } = require('./unified-connection');

// Initialize connection
databaseManager.initialize().catch(error => {
  console.error('Failed to initialize database connection:', error);
  // Don't exit in test environment
  if (process.env.NODE_ENV !== 'test') {
    process.exit(1);
  }
});

// Export pool for backward compatibility
module.exports = {
  pool,
  databaseManager
};
