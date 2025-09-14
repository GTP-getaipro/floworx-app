#!/usr/bin/env node

/**
 * Performance Audit Script for FloWorx SaaS
 * Comprehensive performance analysis and optimization recommendations
 */

const { execSync: _execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const cacheService = require('../services/cacheService');
const performanceService = require('../services/performanceService');

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
    );
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
function runPerformanceAudit() {
  const audit = new PerformanceAudit();
  return audit.runAudit();
}

// Run audit if called directly
if (require.main === module) {
  runPerformanceAudit().catch(error => {
    console.error('❌ Performance audit failed:', error);
    process.exit(1);
  });
}

module.exports = { runPerformanceAudit, PerformanceAudit };
