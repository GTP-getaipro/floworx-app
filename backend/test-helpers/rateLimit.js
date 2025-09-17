/**
 * Rate limit test helpers
 * Provides utilities for managing rate limits in test environment
 */

const { resetRateLimits } = require('../middleware/rateLimiter');

let currentTestRunId = null;

/**
 * Set test run ID for rate limit isolation
 * @param {string} id - Unique test run identifier
 */
function setTestRunId(id) {
  currentTestRunId = id;
  process.env.TEST_RUN_ID = id;
}

/**
 * Get current test run ID
 * @returns {string} Current test run ID
 */
function getTestRunId() {
  return currentTestRunId || process.env.TEST_RUN_ID || 'default';
}

/**
 * Reset all rate limits
 */
function resetAll() {
  resetRateLimits();
}

/**
 * Reset rate limits for current test run
 */
function resetCurrent() {
  resetRateLimits(getTestRunId());
}

module.exports = {
  setTestRunId,
  getTestRunId,
  resetAll,
  resetCurrent
};
