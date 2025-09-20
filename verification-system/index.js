#!/usr/bin/env node

/**
 * FloWorx Comprehensive Verification System
 * 
 * Catches and resolves issues across the entire application:
 * - Method signature conflicts
 * - Parameter mismatches  
 * - Integration failures
 * - Configuration issues
 * - Service connectivity problems
 * 
 * Usage:
 *   node verification-system/index.js [options]
 *   
 * Options:
 *   --mode=full|quick|monitor     Verification mode (default: full)
 *   --fix                         Attempt automatic fixes
 *   --report=json|html|console    Report format (default: console)
 *   --config=path                 Custom config file
 */

const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

// Import verification modules
const StaticAnalyzer = require('./modules/static-analyzer');
const IntegrationTester = require('./modules/integration-tester');
const HealthMonitor = require('./modules/health-monitor');
const AutoResolver = require('./modules/auto-resolver');
const Reporter = require('./modules/reporter');

class FloWorxVerificationSystem {
  constructor(options = {}) {
    this.options = {
      mode: options.mode || 'full',
      fix: options.fix || false,
      report: options.report || 'console',
      config: options.config || './config/verification-config.js',
      verbose: options.verbose || false,
      ...options
    };

    this.results = {
      timestamp: new Date().toISOString(),
      mode: this.options.mode,
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        fixed: 0,
        warnings: 0
      },
      modules: {},
      issues: [],
      fixes: [],
      recommendations: []
    };

    this.startTime = performance.now();
    this.loadConfig();
  }

  loadConfig() {
    try {
      const configPath = path.resolve(__dirname, this.options.config);
      if (fs.existsSync(configPath)) {
        this.config = require(configPath);
      } else {
        this.config = this.getDefaultConfig();
      }
    } catch (error) {
      console.warn('⚠️  Failed to load config, using defaults:', error.message);
      this.config = this.getDefaultConfig();
    }
  }

  getDefaultConfig() {
    return {
      projectRoot: path.resolve(__dirname, '..'),
      modules: {
        staticAnalyzer: { enabled: true, severity: 'high' },
        integrationTester: { enabled: true, timeout: 30000 },
        healthMonitor: { enabled: true, retries: 3 },
        autoResolver: { enabled: true, backupOriginals: true }
      },
      endpoints: {
        api: process.env.NODE_ENV === 'production' 
          ? 'https://app.floworx-iq.com/api'
          : 'http://localhost:5001/api',
        frontend: process.env.NODE_ENV === 'production'
          ? 'https://app.floworx-iq.com'
          : 'http://localhost:3000'
      },
      criticalPaths: [
        'backend/routes',
        'backend/services',
        'backend/database',
        'frontend/src/pages',
        'frontend/src/components',
        'frontend/src/lib'
      ],
      knownIssues: [
        {
          id: 'duplicate-method-signatures',
          pattern: /async\s+(\w+)\s*\([^)]*\)\s*{[\s\S]*?async\s+\1\s*\([^)]*\)/g,
          severity: 'critical',
          description: 'Duplicate method signatures detected'
        },
        {
          id: 'parameter-mismatch',
          pattern: /(\w+)\s*\([^)]*\)[\s\S]*?\1\s*\([^)]*\)/g,
          severity: 'high',
          description: 'Potential parameter mismatch'
        }
      ]
    };
  }

  async run() {
    console.log('🚀 FloWorx Verification System Starting...');
    console.log(`📋 Mode: ${this.options.mode.toUpperCase()}`);
    console.log(`🔧 Auto-fix: ${this.options.fix ? 'ENABLED' : 'DISABLED'}`);
    console.log(`📊 Report: ${this.options.report.toUpperCase()}`);
    console.log('');

    try {
      // Initialize modules
      const modules = await this.initializeModules();

      // Run verification based on mode
      switch (this.options.mode) {
        case 'quick':
          await this.runQuickVerification(modules);
          break;
        case 'monitor':
          await this.runContinuousMonitoring(modules);
          break;
        case 'full':
        default:
          await this.runFullVerification(modules);
          break;
      }

      // Generate final report
      await this.generateReport();

    } catch (error) {
      console.error('❌ Verification system failed:', error);
      this.results.summary.failed++;
      this.results.issues.push({
        type: 'system_error',
        severity: 'critical',
        message: error.message,
        stack: error.stack
      });
    }

    return this.results;
  }

  async initializeModules() {
    const modules = {};

    if (this.config.modules.staticAnalyzer.enabled) {
      modules.staticAnalyzer = new StaticAnalyzer(this.config);
    }

    if (this.config.modules.integrationTester.enabled) {
      modules.integrationTester = new IntegrationTester(this.config);
    }

    if (this.config.modules.healthMonitor.enabled) {
      modules.healthMonitor = new HealthMonitor(this.config);
    }

    if (this.config.modules.autoResolver.enabled && this.options.fix) {
      modules.autoResolver = new AutoResolver(this.config);
    }

    modules.reporter = new Reporter(this.config);

    return modules;
  }

  async runFullVerification(modules) {
    console.log('🔍 Running Full Verification...\n');

    // 1. Static Code Analysis
    if (modules.staticAnalyzer) {
      console.log('📝 Static Code Analysis...');
      const staticResults = await modules.staticAnalyzer.analyze();
      this.processModuleResults('staticAnalyzer', staticResults);
    }

    // 2. Integration Testing
    if (modules.integrationTester) {
      console.log('🧪 Integration Testing...');
      const integrationResults = await modules.integrationTester.test();
      this.processModuleResults('integrationTester', integrationResults);
    }

    // 3. Health Monitoring
    if (modules.healthMonitor) {
      console.log('💓 Health Monitoring...');
      const healthResults = await modules.healthMonitor.check();
      this.processModuleResults('healthMonitor', healthResults);
    }

    // 4. Auto-Resolution (if enabled)
    if (modules.autoResolver && this.options.fix) {
      console.log('🔧 Auto-Resolution...');
      const fixResults = await modules.autoResolver.resolve(this.results.issues);
      this.processFixResults(fixResults);
    }
  }

  async runQuickVerification(modules) {
    console.log('⚡ Running Quick Verification...\n');

    // Quick health check and critical static analysis only
    if (modules.healthMonitor) {
      const healthResults = await modules.healthMonitor.quickCheck();
      this.processModuleResults('healthMonitor', healthResults);
    }

    if (modules.staticAnalyzer) {
      const criticalResults = await modules.staticAnalyzer.analyzeCritical();
      this.processModuleResults('staticAnalyzer', criticalResults);
    }
  }

  async runContinuousMonitoring(modules) {
    console.log('🔄 Starting Continuous Monitoring...\n');
    
    if (!modules.healthMonitor) {
      throw new Error('Health Monitor required for continuous monitoring');
    }

    // Run continuous monitoring loop
    await modules.healthMonitor.startContinuousMonitoring((results) => {
      this.processModuleResults('healthMonitor', results);
      if (results.issues.length > 0) {
        console.log(`⚠️  Issues detected: ${results.issues.length}`);
        this.generateReport();
      }
    });
  }

  processModuleResults(moduleName, results) {
    this.results.modules[moduleName] = results;
    this.results.summary.total += results.summary.total || 0;
    this.results.summary.passed += results.summary.passed || 0;
    this.results.summary.failed += results.summary.failed || 0;
    this.results.summary.warnings += results.summary.warnings || 0;

    if (results.issues) {
      this.results.issues.push(...results.issues);
    }

    if (results.recommendations) {
      this.results.recommendations.push(...results.recommendations);
    }
  }

  processFixResults(fixResults) {
    this.results.summary.fixed += fixResults.fixed || 0;
    if (fixResults.fixes) {
      this.results.fixes.push(...fixResults.fixes);
    }
  }

  async generateReport() {
    const endTime = performance.now();
    this.results.duration = Math.round(endTime - this.startTime);

    const reporter = new Reporter(this.config);
    
    switch (this.options.report) {
      case 'json':
        await reporter.generateJSON(this.results);
        break;
      case 'html':
        await reporter.generateHTML(this.results);
        break;
      case 'console':
      default:
        reporter.generateConsole(this.results);
        break;
    }
  }
}

// CLI Entry Point
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {};

  args.forEach(arg => {
    if (arg.startsWith('--')) {
      const [key, value] = arg.substring(2).split('=');
      options[key] = value || true;
    }
  });

  const verificationSystem = new FloWorxVerificationSystem(options);
  
  verificationSystem.run()
    .then(results => {
      const exitCode = results.summary.failed > 0 ? 1 : 0;
      process.exit(exitCode);
    })
    .catch(error => {
      console.error('💥 System Error:', error);
      process.exit(1);
    });
}

module.exports = FloWorxVerificationSystem;
