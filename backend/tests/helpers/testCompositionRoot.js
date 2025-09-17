/**
 * Test Composition Root
 * Sets up dependency injection for testing
 */

const { createDbManager } = require('../../database/unified-connection');
const { createRealTimeMonitoringService } = require('../../services/realTimeMonitoringService');
const EventEmitter = require('events');

// Test logger that captures logs for assertions
const createTestLogger = () => {
  const logs = {
    info: [],
    warn: [],
    error: []
  };

  return {
    info: (message, meta) => {
      logs.info.push({ message, meta, timestamp: Date.now() });
      if (process.env.NODE_ENV !== 'test') {
        console.log(`[INFO] ${message}`, meta || '');
      }
    },
    warn: (message, meta) => {
      logs.warn.push({ message, meta, timestamp: Date.now() });
      if (process.env.NODE_ENV !== 'test') {
        console.warn(`[WARN] ${message}`, meta || '');
      }
    },
    error: (message, meta) => {
      logs.error.push({ message, meta, timestamp: Date.now() });
      if (process.env.NODE_ENV !== 'test') {
        console.error(`[ERROR] ${message}`, meta || '');
      }
    },
    getLogs: () => logs,
    clearLogs: () => {
      logs.info = [];
      logs.warn = [];
      logs.error = [];
    }
  };
};

/**
 * Create test composition root with real or mocked dependencies
 * @param {Object} options - Configuration options
 * @param {boolean} options.useRealDb - Whether to use real database connection
 * @param {Object} options.mockDb - Mock database instance (if not using real db)
 * @returns {Object} Composed services
 */
async function createTestCompositionRoot(options = {}) {
  const { useRealDb = false, mockDb = null } = options;
  
  let db;
  if (useRealDb) {
    // Create a real database manager for integration tests
    db = createDbManager();
    try {
      await db.initialize();
    } catch (error) {
      console.warn('Database not available for integration tests:', error.message);
      db = null;
    }
  } else {
    // Use provided mock or create a basic mock
    db = mockDb || {
      query: jest.fn().mockResolvedValue({ rows: [] }),
      healthCheck: jest.fn().mockResolvedValue({ connected: true }),
      useRestApi: false,
      restClient: null,
      setPerformanceTracker: jest.fn()
    };
  }

  // Create pub/sub event emitter
  const pubsub = new EventEmitter();
  
  // Create test logger
  const logger = createTestLogger();

  // Create monitoring service if database is available
  let realTimeMonitoringService = null;
  if (db) {
    realTimeMonitoringService = createRealTimeMonitoringService({
      db,
      pubsub,
      logger
    });

    // Wire database performance tracking if it's a real database
    if (useRealDb && db.setPerformanceTracker) {
      db.setPerformanceTracker((queryData) => {
        realTimeMonitoringService.trackQuery(
          queryData.queryText,
          queryData.params,
          queryData.duration,
          queryData.success,
          queryData.error ? { message: queryData.error } : null
        );
      });
    }
  }

  return {
    db,
    pubsub,
    logger,
    realTimeMonitoringService,
    
    // Cleanup function for tests
    cleanup: async () => {
      if (realTimeMonitoringService) {
        realTimeMonitoringService.stopMonitoring();
      }
      if (useRealDb && db) {
        await db.close();
      }
    }
  };
}

module.exports = {
  createTestCompositionRoot,
  createTestLogger
};
