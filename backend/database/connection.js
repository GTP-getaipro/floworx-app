/**
 * Database Connection Module
 * Simple wrapper around unified-connection for backward compatibility
 *
 * DEPRECATED: This module is deprecated. Use unified-connection.js directly
 * with the new dependency injection pattern.
 */


// Export pool for backward compatibility
// Note: This is a legacy interface and should be migrated to DI pattern
module.exports = {
  pool,
  databaseManager
};
