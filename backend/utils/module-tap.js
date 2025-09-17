/**
 * Module Load Tracer
 * 
 * Lightweight tracer that logs module loads once when CODE_AUDIT=1.
 * Safe for production use - only logs at debug level when audit flag is enabled.
 * 
 * Usage: Add to top of key entry files:
 * require('../utils/module-tap')(module.id);
 */

const seen = new Set();

/**
 * Tap a module load for audit tracking
 * @param {string} id - Module identifier (usually module.id)
 */
function tap(id) {
  if (!seen.has(id)) {
    seen.add(id);
    
    // Only log when CODE_AUDIT flag is enabled
    if (process.env.CODE_AUDIT === '1') {
      console.log(JSON.stringify({ 
        evt: 'module_loaded', 
        id, 
        ts: Date.now(),
        pid: process.pid
      }));
    }
  }
}

/**
 * Get all seen modules (for debugging)
 * @returns {Array<string>} Array of module IDs that have been loaded
 */
function getSeenModules() {
  return Array.from(seen);
}

/**
 * Clear the seen modules cache (for testing)
 */
function clearSeen() {
  seen.clear();
}

/**
 * Get statistics about module loading
 * @returns {Object} Statistics object
 */
function getStats() {
  return {
    totalModulesLoaded: seen.size,
    auditEnabled: process.env.CODE_AUDIT === '1',
    timestamp: new Date().toISOString()
  };
}

module.exports = tap;
module.exports.getSeenModules = getSeenModules;
module.exports.clearSeen = clearSeen;
module.exports.getStats = getStats;
