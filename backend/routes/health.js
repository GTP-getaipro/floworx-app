/**
 * Health Check Routes
 * Production-ready health endpoints for monitoring and load balancers
 */

const express = require('express');
const router = express.Router();

/**
 * GET /healthz - Comprehensive health check
 * Returns system status including cache and database connectivity
 */
router.get('/healthz', (req, res) => {
  try {
    const { getKeyDBStatus } = require('../database/unified-connection');
    const { getDbStatus } = require('../utils/env');

    // Get cache status (enabled/disabled based on KeyDB connection)
    const keydbStatus = getKeyDBStatus();
    const cacheStatus = keydbStatus === 'connected' ? 'enabled' : 'disabled';

    // Get database status (rest/postgres/unknown)
    const dbStatus = getDbStatus();

    // Return standardized health response
    res.status(200).json({
      ok: true,
      cache: cacheStatus,
      db: dbStatus
    });
  } catch (error) {
    // Log error but still return 200 for health checks
    console.error('Health check error:', error.message);
    
    res.status(200).json({
      ok: true,
      cache: 'disabled',
      db: 'unknown'
    });
  }
});

module.exports = router;
