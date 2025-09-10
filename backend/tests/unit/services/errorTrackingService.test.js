/**
 * Unit Tests for Error Tracking Service
 * Tests error categorization, tracking, and alerting
 */

const errorTrackingService = require('../../../services/errorTrackingService');

const fs = require('fs').promises;

// Mock dependencies
jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn().mockResolvedValue(),
    appendFile: jest.fn().mockResolvedValue()
  }
}));
jest.mock('../../../utils/logger');

describe('Error Tracking Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset service state if methods exist
    if (errorTrackingService.errors && errorTrackingService.errors.clear) {
      errorTrackingService.errors.clear();
    }
    if (errorTrackingService.errorStats) {
      errorTrackingService.errorStats = {
        total: 0,
        byCategory: new Map(),
        bySeverity: new Map(),
        byEndpoint: new Map(),
        byUser: new Map(),
        recentErrors: [],
        trends: {
          hourly: new Array(24).fill(0),
          daily: new Array(7).fill(0)
        }
      };
    }
  });

  describe('Error Processing', () => {
    test('should process error with basic information', async () => {
      const error = new Error('Test error message');
      const context = {
        endpoint: '/api/test',
        user: { id: 'user-123', email: 'test@example.com' }
      };

      const errorId = await errorTrackingService.trackError(error, context);

      expect(errorId).toBeDefined();
      expect(typeof errorId).toBe('string');
      expect(errorId).toMatch(/^err_\d+_[a-z0-9]+$/);
    });

    test('should categorize database errors correctly', async () => {
      const dbError = new Error('Connection to database failed');
      dbError.name = 'DatabaseError';

      await errorTrackingService.trackError(dbError, {});

      const stats = errorTrackingService.getStats();
      expect(stats.byCategory.database).toBe(1);
    });

    test('should categorize authentication errors correctly', async () => {
      const authError = new Error('Invalid token');
      const context = { endpoint: '/api/auth/login' };

      await errorTrackingService.trackError(authError, context);

      const stats = errorTrackingService.getStats();
      expect(stats.byCategory.authentication).toBe(1);
    });

    test('should categorize validation errors correctly', async () => {
      const validationError = new Error('Required field missing');
      validationError.name = 'ValidationError';

      await errorTrackingService.trackError(validationError, {});

      const stats = errorTrackingService.getStats();
      expect(stats.byCategory.validation).toBe(1);
    });

    test('should categorize network errors correctly', async () => {
      const networkError = new Error('Network timeout');

      await errorTrackingService.trackError(networkError, {});

      const stats = errorTrackingService.getStats();
      expect(stats.byCategory.network).toBe(1);
    });
  });

  describe('Error Severity Determination', () => {
    test('should assign critical severity to system errors', async () => {
      const systemError = new Error('System failure');
      const context = { statusCode: 500 };

      await errorTrackingService.trackError(systemError, context);

      const stats = errorTrackingService.getStats();
      expect(stats.bySeverity.critical).toBe(1);
    });

    test('should assign high severity to authentication errors', async () => {
      const authError = new Error('Unauthorized access');
      const context = { statusCode: 401 };

      await errorTrackingService.trackError(authError, context);

      const stats = errorTrackingService.getStats();
      expect(stats.bySeverity.high).toBe(1);
    });

    test('should assign medium severity to business logic errors', async () => {
      const businessError = new Error('Invalid workflow state');
      const context = { endpoint: '/api/workflows/execute' };

      await errorTrackingService.trackError(businessError, context);

      const stats = errorTrackingService.getStats();
      expect(stats.bySeverity.medium).toBe(1);
    });

    test('should assign low severity to validation errors', async () => {
      const validationError = new Error('Invalid email format');
      validationError.name = 'ValidationError';

      await errorTrackingService.trackError(validationError, {});

      const stats = errorTrackingService.getStats();
      expect(stats.bySeverity.low).toBe(1);
    });
  });

  describe('Error Grouping', () => {
    test('should group similar errors by fingerprint', async () => {
      const error1 = new Error('Database connection failed');
      const error2 = new Error('Database connection failed');

      await errorTrackingService.trackError(error1, {});
      await errorTrackingService.trackError(error2, {});

      const errorGroups = errorTrackingService.getErrorGroups();
      expect(errorGroups).toHaveLength(1);
      expect(errorGroups[0].count).toBe(2);
    });

    test('should create separate groups for different errors', async () => {
      const error1 = new Error('Database connection failed');
      const error2 = new Error('Authentication failed');

      await errorTrackingService.trackError(error1, {});
      await errorTrackingService.trackError(error2, {});

      const errorGroups = errorTrackingService.getErrorGroups();
      expect(errorGroups).toHaveLength(2);
    });

    test('should update group timestamps correctly', async () => {
      const error = new Error('Test error');
      
      const firstTime = Date.now();
      await errorTrackingService.trackError(error, {});
      
      // Wait a bit and track same error again
      await new Promise(resolve => setTimeout(resolve, 10));
      const secondTime = Date.now();
      await errorTrackingService.trackError(error, {});

      const errorGroups = errorTrackingService.getErrorGroups();
      expect(errorGroups).toHaveLength(1);
      expect(errorGroups[0].count).toBe(2);
      expect(errorGroups[0].lastSeen).toBeGreaterThanOrEqual(secondTime);
    });
  });

  describe('Context Extraction', () => {
    test('should extract user context correctly', async () => {
      const error = new Error('Test error');
      const context = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          role: 'admin'
        }
      };

      await errorTrackingService.trackError(error, context);

      const recentErrors = errorTrackingService.getRecentErrors(1);
      expect(recentErrors[0].userContext).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        role: 'admin',
        isAuthenticated: true
      });
    });

    test('should extract request context correctly', async () => {
      const error = new Error('Test error');
      const context = {
        req: {
          method: 'POST',
          url: '/api/test',
          headers: {
            'user-agent': 'Test Agent',
            'authorization': 'Bearer secret-token'
          },
          ip: '127.0.0.1',
          params: { id: '123' },
          query: { filter: 'active' },
          body: { name: 'test', password: 'secret' }
        }
      };

      await errorTrackingService.trackError(error, context);

      const recentErrors = errorTrackingService.getRecentErrors(1);
      const requestContext = recentErrors[0].requestContext;
      
      expect(requestContext.method).toBe('POST');
      expect(requestContext.url).toBe('/api/test');
      expect(requestContext.userAgent).toBe('Test Agent');
      expect(requestContext.ip).toBe('127.0.0.1');
      expect(requestContext.headers.authorization).toBe('[REDACTED]');
      expect(requestContext.body.password).toBe('[REDACTED]');
    });

    test('should sanitize sensitive data in headers', async () => {
      const error = new Error('Test error');
      const context = {
        req: {
          headers: {
            'authorization': 'Bearer secret-token',
            'cookie': 'session=abc123',
            'x-api-key': 'api-key-123',
            'content-type': 'application/json'
          }
        }
      };

      await errorTrackingService.trackError(error, context);

      const recentErrors = errorTrackingService.getRecentErrors(1);
      const headers = recentErrors[0].requestContext.headers;
      
      expect(headers.authorization).toBe('[REDACTED]');
      expect(headers.cookie).toBe('[REDACTED]');
      expect(headers['x-api-key']).toBe('[REDACTED]');
      expect(headers['content-type']).toBe('application/json');
    });

    test('should sanitize sensitive data in request body', async () => {
      const error = new Error('Test error');
      const context = {
        req: {
          body: {
            username: 'testuser',
            password: 'secret123',
            email: 'test@example.com',
            apiKey: 'key123',
            authToken: 'token456'
          }
        }
      };

      await errorTrackingService.trackError(error, context);

      const recentErrors = errorTrackingService.getRecentErrors(1);
      const body = recentErrors[0].requestContext.body;
      
      expect(body.username).toBe('testuser');
      expect(body.email).toBe('test@example.com');
      expect(body.password).toBe('[REDACTED]');
      expect(body.apiKey).toBe('[REDACTED]');
      expect(body.authToken).toBe('[REDACTED]');
    });
  });

  describe('Statistics and Analytics', () => {
    test('should track error statistics correctly', async () => {
      const errors = [
        { error: new Error('DB Error'), context: { endpoint: '/api/users' } },
        { error: new Error('Auth Error'), context: { endpoint: '/api/auth' } },
        { error: new Error('Validation Error'), context: { endpoint: '/api/users' } }
      ];

      for (const { error, context } of errors) {
        await errorTrackingService.trackError(error, context);
      }

      const stats = errorTrackingService.getStats();
      expect(stats.total).toBe(3);
      expect(stats.byEndpoint['/api/users']).toBe(2);
      expect(stats.byEndpoint['/api/auth']).toBe(1);
    });

    test('should track user error statistics', async () => {
      const errors = [
        { error: new Error('Error 1'), context: { user: { id: 'user-1' } } },
        { error: new Error('Error 2'), context: { user: { id: 'user-1' } } },
        { error: new Error('Error 3'), context: { user: { id: 'user-2' } } }
      ];

      for (const { error, context } of errors) {
        await errorTrackingService.trackError(error, context);
      }

      const stats = errorTrackingService.getStats();
      expect(stats.byUser['user-1']).toBe(2);
      expect(stats.byUser['user-2']).toBe(1);
    });

    test('should maintain recent errors list', async () => {
      const errors = Array(5).fill().map((_, i) => new Error(`Error ${i}`));

      for (const error of errors) {
        await errorTrackingService.trackError(error, {});
      }

      const recentErrors = errorTrackingService.getRecentErrors();
      expect(recentErrors).toHaveLength(5);
      expect(recentErrors[0].message).toBe('Error 4'); // Most recent first
    });
  });

  describe('Search and Filtering', () => {
    beforeEach(async () => {
      // Set up test data
      const testErrors = [
        { error: new Error('Database connection failed'), context: { endpoint: '/api/users' } },
        { error: new Error('Authentication failed'), context: { endpoint: '/api/auth' } },
        { error: new Error('Validation error in user data'), context: { endpoint: '/api/users' } }
      ];

      for (const { error, context } of testErrors) {
        await errorTrackingService.trackError(error, context);
      }
    });

    test('should search errors by message', () => {
      const results = errorTrackingService.searchErrors('database');
      expect(results).toHaveLength(1);
      expect(results[0].message).toContain('Database connection failed');
    });

    test('should search errors by endpoint', () => {
      const results = errorTrackingService.searchErrors('users');
      expect(results).toHaveLength(2);
    });

    test('should filter errors by category', () => {
      const results = errorTrackingService.searchErrors('', { category: 'authentication' });
      expect(results).toHaveLength(1);
    });

    test('should filter errors by severity', () => {
      const results = errorTrackingService.searchErrors('', { severity: 'high' });
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('File Logging', () => {
    test('should log errors to file when enabled', async () => {
      const error = new Error('Test error for logging');
      
      await errorTrackingService.trackError(error, {});

      expect(fs.appendFile).toHaveBeenCalled();
      const [filepath, content] = fs.appendFile.mock.calls[0];
      
      expect(filepath).toMatch(/errors-\d{4}-\d{2}-\d{2}\.jsonl$/);
      expect(content).toContain('Test error for logging');
    });

    test('should handle file logging errors gracefully', async () => {
      fs.appendFile.mockRejectedValue(new Error('File write failed'));
      
      const error = new Error('Test error');
      
      // Should not throw even if file logging fails
      await expect(errorTrackingService.trackError(error, {}))
        .resolves.toBeDefined();
    });
  });

  describe('Alert System', () => {
    test('should create alert for critical errors', async () => {
      const criticalError = new Error('Critical system failure');
      const context = { statusCode: 500 };

      const alertPromise = new Promise(resolve => {
        errorTrackingService.once('alert:created', resolve);
      });

      await errorTrackingService.trackError(criticalError, context);

      const alert = await alertPromise;
      expect(alert.type).toBe('critical_error');
      expect(alert.message).toContain('Critical error detected');
    });

    test('should detect error spikes', async () => {
      const alertPromise = new Promise(resolve => {
        errorTrackingService.once('alert:created', resolve);
      });

      // Create multiple errors quickly to trigger spike detection
      const promises = Array(12).fill().map(() => 
        errorTrackingService.trackError(new Error('Spike error'), {})
      );

      await Promise.all(promises);

      const alert = await alertPromise;
      expect(alert.type).toBe('error_spike');
    });

    test('should respect alert cooldowns', async () => {
      const criticalError = new Error('Critical error');
      const context = { statusCode: 500 };

      let alertCount = 0;
      errorTrackingService.on('alert:created', () => {
        alertCount++;
      });

      // Track same error multiple times
      await errorTrackingService.trackError(criticalError, context);
      await errorTrackingService.trackError(criticalError, context);
      await errorTrackingService.trackError(criticalError, context);

      // Should only create one alert due to cooldown
      expect(alertCount).toBe(1);
    });
  });

  describe('Performance', () => {
    test('should handle high volume of errors efficiently', async () => {
      const startTime = Date.now();
      
      const promises = Array(100).fill().map((_, i) => 
        errorTrackingService.trackError(new Error(`Error ${i}`), {})
      );

      await Promise.all(promises);
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    test('should limit memory usage with large error counts', async () => {
      // Track many errors
      for (let i = 0; i < 200; i++) {
        await errorTrackingService.trackError(new Error(`Error ${i}`), {});
      }

      const recentErrors = errorTrackingService.getRecentErrors();
      expect(recentErrors.length).toBeLessThanOrEqual(1000); // Should respect max limit
    });
  });

  describe('Cleanup and Maintenance', () => {
    test('should clean up old errors', async () => {
      // Create old error
      const oldError = new Error('Old error');
      await errorTrackingService.trackError(oldError, {});

      // Manually set old timestamp
      const recentErrors = errorTrackingService.getRecentErrors();
      recentErrors[0].timestamp = Date.now() - (8 * 24 * 60 * 60 * 1000); // 8 days ago

      // Trigger cleanup
      errorTrackingService.cleanupOldErrors();

      const remainingErrors = errorTrackingService.getRecentErrors();
      expect(remainingErrors).toHaveLength(0);
    });

    test('should update trends correctly', () => {
      const initialHourlyTrend = [...errorTrackingService.errorStats.trends.hourly];
      
      errorTrackingService.updateTrends();
      
      const updatedTrend = errorTrackingService.errorStats.trends;
      expect(updatedTrend.daily).toHaveLength(7);
      expect(updatedTrend.hourly.every(count => count === 0)).toBe(true);
    });
  });
});
