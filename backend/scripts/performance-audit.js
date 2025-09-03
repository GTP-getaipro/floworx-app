#!/usr/bin/env node

/**
 * Performance Audit Script for FloWorx SaaS
 * Comprehensive performance analysis and optimization recommendations
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const performanceService = require('../services/performanceService');
const cacheService = require('../services/cacheService');

/**
 * Performance audit configuration
 */
const AUDIT_CONFIG = {
  // Performance thresholds
  thresholds: {
    slowEndpoint: 1000, // 1 second
    criticalEndpoint: 3000, // 3 seconds
    slowQuery: 500, // 500ms
    criticalQuery: 2000, // 2 seconds
    lowCacheHitRate: 0.7, // 70%
    highErrorRate: 0.05, // 5%
    highMemoryUsage: 0.8 // 80%
  },

  // Endpoints to specifically monitor
  criticalEndpoints: [
    '/api/auth/login',
    '/api/auth/register',
    '/api/onboarding/session',
    '/api/workflows/execute',
    '/api/analytics/dashboard'
  ],

  // Database tables to analyze
  criticalTables: ['users', 'workflows', 'workflow_executions', 'onboarding_sessions', 'analytics_events']
};

/**
 * Performance audit class
 */
class PerformanceAudit {
  constructor() {
    this.results = {
      summary: {
        overallScore: 0,
        criticalIssues: 0,
        warnings: 0,
        recommendations: 0,
        auditTime: new Date().toISOString()
      },
      endpoints: [],
      database: [],
      cache: {},
      system: {},
      recommendations: []
    };
  }

  /**
   * Run comprehensive performance audit
   */
  async runAudit() {
    console.log('🚀 Starting FloWorx Performance Audit...');
    console.log('==========================================');

    try {
      // Audit API endpoints
      await this.auditEndpoints();

      // Audit database performance
      await this.auditDatabase();

      // Audit cache performance
      await this.auditCache();

      // Audit system resources
      await this.auditSystem();

      // Generate recommendations
      this.generateRecommendations();

      // Calculate overall score
      this.calculateOverallScore();

      // Generate report
      const reportFile = this.generateReport();

      // Display summary
      this.displaySummary();

      return reportFile;
    } catch (error) {
      console.error('❌ Performance audit failed:', error);
      throw error;
    }
  }

  /**
   * Audit API endpoint performance
   */
  async auditEndpoints() {
    console.log('📊 Auditing API endpoints...');

    const performanceSummary = performanceService.getPerformanceSummary();

    // Analyze slow endpoints
    performanceSummary.slowRequests.forEach(endpoint => {
      const issue = {
        endpoint: endpoint.path,
        avgResponseTime: endpoint.avgTime,
        maxResponseTime: endpoint.maxTime,
        requestCount: endpoint.count,
        errorRate: parseFloat(endpoint.errorRate),
        severity: this.getEndpointSeverity(endpoint.avgTime),
        recommendations: this.getEndpointRecommendations(endpoint)
      };

      this.results.endpoints.push(issue);

      if (issue.severity === 'critical') {
        this.results.summary.criticalIssues++;
      } else if (issue.severity === 'warning') {
        this.results.summary.warnings++;
      }
    });

    // Check critical endpoints specifically
    AUDIT_CONFIG.criticalEndpoints.forEach(endpoint => {
      const metrics = performanceService.getEndpointMetrics(endpoint);
      if (metrics && metrics.metrics.avgTime > AUDIT_CONFIG.thresholds.slowEndpoint) {
        console.warn(`⚠️ Critical endpoint is slow: ${endpoint} (${metrics.metrics.avgTime}ms)`);
      }
    });
  }

  /**
   * Audit database performance
   */
  async auditDatabase() {
    console.log('🗄️ Auditing database performance...');

    try {
      // Get slow queries from performance service
      const performanceSummary = performanceService.getPerformanceSummary();

      performanceSummary.slowQueries.forEach(query => {
        const issue = {
          query: query.query,
          avgTime: query.avgTime,
          maxTime: query.maxTime,
          executionCount: query.count,
          errorRate: parseFloat(query.errorRate),
          severity: this.getQuerySeverity(query.avgTime),
          recommendations: this.getQueryRecommendations(query)
        };

        this.results.database.push(issue);

        if (issue.severity === 'critical') {
          this.results.summary.criticalIssues++;
        } else if (issue.severity === 'warning') {
          this.results.summary.warnings++;
        }
      });

      // Check for missing indexes (simplified check)
      await this.checkMissingIndexes();
    } catch (error) {
      console.warn('⚠️ Database audit failed:', error.message);
    }
  }

  /**
   * Audit cache performance
   */
  async auditCache() {
    console.log('💾 Auditing cache performance...');

    try {
      const cacheStats = cacheService.getStats();
      const cacheHealth = await cacheService.healthCheck();

      this.results.cache = {
        redis: {
          status: cacheHealth.redis.status,
          latency: cacheHealth.redis.latency
        },
        performance: {
          hitRate: cacheStats.combined.hitRate,
          totalHits: cacheStats.combined.hits,
          totalMisses: cacheStats.combined.misses,
          errorCount: cacheStats.combined.errors
        },
        recommendations: []
      };

      // Check cache hit rate
      if (cacheStats.combined.hitRate < AUDIT_CONFIG.thresholds.lowCacheHitRate) {
        this.results.cache.recommendations.push({
          type: 'low_hit_rate',
          message: `Cache hit rate is low: ${(cacheStats.combined.hitRate * 100).toFixed(1)}%`,
          suggestion: 'Review caching strategy and TTL values'
        });
        this.results.summary.warnings++;
      }

      // Check Redis connectivity
      if (cacheHealth.redis.status !== 'connected') {
        this.results.cache.recommendations.push({
          type: 'redis_disconnected',
          message: 'Redis is not connected, falling back to memory cache',
          suggestion: 'Check Redis configuration and connectivity'
        });
        this.results.summary.warnings++;
      }
    } catch (error) {
      console.warn('⚠️ Cache audit failed:', error.message);
    }
  }

  /**
   * Audit system resources
   */
  async auditSystem() {
    console.log('🖥️ Auditing system resources...');

    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    this.results.system = {
      memory: {
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
        external: Math.round(memUsage.external / 1024 / 1024), // MB
        rss: Math.round(memUsage.rss / 1024 / 1024), // MB
        usage: memUsage.heapUsed / memUsage.heapTotal
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      uptime: Math.round(process.uptime()),
      nodeVersion: process.version,
      platform: process.platform
    };

    // Check memory usage
    if (this.results.system.memory.usage > AUDIT_CONFIG.thresholds.highMemoryUsage) {
      this.results.recommendations.push({
        category: 'system',
        priority: 'high',
        message: `High memory usage: ${(this.results.system.memory.usage * 100).toFixed(1)}%`,
        suggestion: 'Consider optimizing memory usage or increasing available memory'
      });
      this.results.summary.criticalIssues++;
    }
  }

  /**
   * Check for missing database indexes
   */
  async checkMissingIndexes() {
    // This is a simplified check - in a real implementation,
    // you would analyze query patterns and suggest specific indexes
    const commonMissingIndexes = [
      { table: 'users', column: 'email', reason: 'Frequent login queries' },
      { table: 'workflows', column: 'user_id', reason: 'User workflow lookups' },
      { table: 'analytics_events', column: 'created_at', reason: 'Time-based queries' }
    ];

    commonMissingIndexes.forEach(index => {
      this.results.database.push({
        type: 'missing_index',
        table: index.table,
        column: index.column,
        reason: index.reason,
        severity: 'warning',
        recommendations: [`CREATE INDEX idx_${index.table}_${index.column} ON ${index.table}(${index.column});`]
      });
    });
  }

  /**
   * Get endpoint severity level
   */
  getEndpointSeverity(avgTime) {
    if (avgTime > AUDIT_CONFIG.thresholds.criticalEndpoint) {
      return 'critical';
    }
    if (avgTime > AUDIT_CONFIG.thresholds.slowEndpoint) {
      return 'warning';
    }
    return 'info';
  }

  /**
   * Get query severity level
   */
  getQuerySeverity(avgTime) {
    if (avgTime > AUDIT_CONFIG.thresholds.criticalQuery) {
      return 'critical';
    }
    if (avgTime > AUDIT_CONFIG.thresholds.slowQuery) {
      return 'warning';
    }
    return 'info';
  }

  /**
   * Get endpoint optimization recommendations
   */
  getEndpointRecommendations(endpoint) {
    const recommendations = [];

    if (endpoint.avgTime > 2000) {
      recommendations.push('Implement caching for this endpoint');
      recommendations.push('Add pagination if returning large datasets');
      recommendations.push('Optimize database queries');
    }

    if (parseFloat(endpoint.errorRate) > 5) {
      recommendations.push('Investigate and fix recurring errors');
    }

    return recommendations;
  }

  /**
   * Get query optimization recommendations
   */
  getQueryRecommendations(query) {
    const recommendations = [];

    if (query.avgTime > 1000) {
      recommendations.push('Add database indexes for this query');
      recommendations.push('Consider query optimization');
      recommendations.push('Implement result caching');
    }

    return recommendations;
  }

  /**
   * Generate comprehensive recommendations
   */
  generateRecommendations() {
    // Add general recommendations based on audit results
    if (this.results.endpoints.length > 0) {
      this.results.recommendations.push({
        category: 'endpoints',
        priority: 'high',
        message: `${this.results.endpoints.length} slow endpoints detected`,
        suggestion: 'Implement caching and optimize slow endpoints'
      });
    }

    if (this.results.database.length > 0) {
      this.results.recommendations.push({
        category: 'database',
        priority: 'high',
        message: `${this.results.database.length} database performance issues detected`,
        suggestion: 'Add missing indexes and optimize slow queries'
      });
    }

    this.results.summary.recommendations = this.results.recommendations.length;
  }

  /**
   * Calculate overall performance score
   */
  calculateOverallScore() {
    let score = 100;

    // Deduct points for issues
    score -= this.results.summary.criticalIssues * 20;
    score -= this.results.summary.warnings * 10;

    // Bonus points for good cache performance
    if (this.results.cache.performance?.hitRate > 0.8) {
      score += 5;
    }

    this.results.summary.overallScore = Math.max(0, Math.min(100, score));
  }

  /**
   * Generate performance report
   */
  generateReport() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportFile = path.join(process.cwd(), 'reports', `performance-audit-${timestamp}.json`);

    // Ensure reports directory exists
    const reportsDir = path.dirname(reportFile);
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    // Write report
    fs.writeFileSync(reportFile, JSON.stringify(this.results, null, 2));

    return reportFile;
  }

  /**
   * Display audit summary
   */
  displaySummary() {
    console.log('\n📊 Performance Audit Summary:');
    console.log('==============================');
    console.log(`Overall Score: ${this.results.summary.overallScore}/100`);
    console.log(`🚨 Critical Issues: ${this.results.summary.criticalIssues}`);
    console.log(`⚠️  Warnings: ${this.results.summary.warnings}`);
    console.log(`📋 Recommendations: ${this.results.summary.recommendations}`);
    console.log(`🔍 Slow Endpoints: ${this.results.endpoints.length}`);
    console.log(`🗄️  Database Issues: ${this.results.database.length}`);

    if (this.results.cache.performance) {
      console.log(`💾 Cache Hit Rate: ${(this.results.cache.performance.hitRate * 100).toFixed(1)}%`);
    }

    console.log(`🖥️  Memory Usage: ${(this.results.system.memory?.usage * 100 || 0).toFixed(1)}%`);

    // Performance grade
    const score = this.results.summary.overallScore;
    let grade = 'F';
    if (score >= 90) {
      grade = 'A';
    } else if (score >= 80) {
      grade = 'B';
    } else if (score >= 70) {
      grade = 'C';
    } else if (score >= 60) {
      grade = 'D';
    }

    console.log(`\n🎯 Performance Grade: ${grade}`);

    if (this.results.summary.criticalIssues > 0) {
      console.log('\n❌ Critical performance issues detected!');
      process.exit(1);
    } else if (this.results.summary.warnings > 0) {
      console.log('\n⚠️  Performance warnings detected.');
    } else {
      console.log('\n✅ No critical performance issues found.');
    }
  }
}

/**
 * Main audit function
 */
async function runPerformanceAudit() {
  const audit = new PerformanceAudit();
  return await audit.runAudit();
}

// Run audit if called directly
if (require.main === module) {
  runPerformanceAudit().catch(error => {
    console.error('❌ Performance audit failed:', error);
    process.exit(1);
  });
}

module.exports = { runPerformanceAudit, PerformanceAudit };
