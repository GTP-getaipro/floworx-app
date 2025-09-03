#!/usr/bin/env node

/**
 * Quick Start Production Setup Script
 * Automated execution of all production setup steps
 */

const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

class QuickStartProduction {
  constructor() {
    this.steps = [
      {
        name: 'Environment Configuration',
        script: 'setup-production-environment.js',
        args: ['--non-interactive'],
        required: true
      },
      {
        name: 'Alert Channels Setup',
        script: 'setup-alert-channels.js',
        args: [],
        required: true
      },
      {
        name: 'Deployment Dry Run',
        script: 'deploy-production-monitoring.js',
        args: ['--dry-run'],
        required: true
      },
      {
        name: 'Production Deployment',
        script: 'deploy-production-monitoring.js',
        args: ['--verbose'],
        required: true
      },
      {
        name: 'Deployment Validation',
        script: 'validate-deployment.js',
        args: [],
        required: true
      },
      {
        name: 'Health & Alert Testing',
        script: 'monitor-health-and-alerts.js',
        args: [],
        required: false
      }
    ];

    this.results = {};
    this.startTime = Date.now();
  }

  /**
   * Main execution
   */
  async run() {
    try {
      console.log('🚀 FloWorx Production Quick Start');
      console.log('=================================');
      console.log(`Started: ${new Date().toISOString()}`);
      console.log('');

      // Check prerequisites
      await this.checkPrerequisites();

      // Execute setup steps
      for (let i = 0; i < this.steps.length; i++) {
        const step = this.steps[i];
        console.log(`📋 Step ${i + 1}/${this.steps.length}: ${step.name}`);
        
        try {
          const result = await this.executeStep(step);
          this.results[step.name] = { status: 'success', ...result };
          console.log(`✅ Step ${i + 1} completed: ${step.name}`);
        } catch (error) {
          this.results[step.name] = { status: 'failed', error: error.message };
          console.log(`❌ Step ${i + 1} failed: ${step.name} - ${error.message}`);
          
          if (step.required) {
            console.log('🛑 Required step failed. Stopping deployment.');
            break;
          } else {
            console.log('⚠️  Optional step failed. Continuing...');
          }
        }
        
        console.log('');
      }

      // Generate final report
      await this.generateFinalReport();

      // Display summary
      this.displaySummary();

    } catch (error) {
      console.error('❌ Quick start failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * Check prerequisites
   */
  async checkPrerequisites() {
    console.log('🔍 Checking prerequisites...');

    const checks = [
      { name: 'Node.js version', check: () => this.checkNodeVersion() },
      { name: 'Required files', check: () => this.checkRequiredFiles() },
      { name: 'Database availability', check: () => this.checkDatabaseAvailability() }
    ];

    for (const check of checks) {
      try {
        await check.check();
        console.log(`  ✅ ${check.name}`);
      } catch (error) {
        console.log(`  ❌ ${check.name}: ${error.message}`);
        throw new Error(`Prerequisite check failed: ${check.name}`);
      }
    }

    console.log('✅ Prerequisites check passed');
    console.log('');
  }

  /**
   * Check Node.js version
   */
  checkNodeVersion() {
    const version = process.version;
    const major = parseInt(version.substring(1).split('.')[0]);
    
    if (major < 16) {
      throw new Error(`Node.js 16+ required, found ${version}`);
    }
  }

  /**
   * Check required files
   */
  async checkRequiredFiles() {
    const requiredFiles = [
      '.env.production.template',
      'scripts/setup-production-environment.js',
      'scripts/deploy-production-monitoring.js'
    ];

    for (const file of requiredFiles) {
      try {
        await fs.access(file);
      } catch (error) {
        throw new Error(`Required file missing: ${file}`);
      }
    }
  }

  /**
   * Check database availability
   */
  async checkDatabaseAvailability() {
    // This is a basic check - the actual database test will happen in the scripts
    if (!process.env.DATABASE_URL && !process.env.DB_HOST) {
      console.log('  ⚠️  Database environment variables not set (will be configured in step 1)');
    }
  }

  /**
   * Execute a setup step
   */
  async executeStep(step) {
    return new Promise((resolve, reject) => {
      const scriptPath = path.join(__dirname, step.script);
      const child = spawn('node', [scriptPath, ...step.args], {
        stdio: ['inherit', 'pipe', 'pipe'],
        cwd: process.cwd()
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        const output = data.toString();
        stdout += output;
        // Show real-time output for important steps
        if (step.name.includes('Deployment') || step.name.includes('Validation')) {
          process.stdout.write(output);
        }
      });

      child.stderr.on('data', (data) => {
        const output = data.toString();
        stderr += output;
        process.stderr.write(output);
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve({
            exitCode: code,
            stdout: stdout.trim(),
            stderr: stderr.trim()
          });
        } else {
          reject(new Error(`Script exited with code ${code}: ${stderr.trim() || stdout.trim()}`));
        }
      });

      child.on('error', (error) => {
        reject(new Error(`Failed to start script: ${error.message}`));
      });
    });
  }

  /**
   * Generate final report
   */
  async generateFinalReport() {
    const duration = Date.now() - this.startTime;
    const report = {
      timestamp: new Date().toISOString(),
      duration: `${(duration / 1000).toFixed(2)}s`,
      steps: this.steps.map(step => ({
        name: step.name,
        required: step.required,
        result: this.results[step.name] || { status: 'not_executed' }
      })),
      summary: this.calculateSummary(),
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        cwd: process.cwd()
      }
    };

    try {
      await fs.mkdir('./reports', { recursive: true });
      const reportPath = `./reports/quick-start-${Date.now()}.json`;
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
      console.log(`📄 Quick start report saved: ${reportPath}`);
    } catch (error) {
      console.warn(`⚠️  Failed to save report: ${error.message}`);
    }
  }

  /**
   * Calculate summary
   */
  calculateSummary() {
    const total = this.steps.length;
    const executed = Object.keys(this.results).length;
    const successful = Object.values(this.results).filter(r => r.status === 'success').length;
    const failed = Object.values(this.results).filter(r => r.status === 'failed').length;

    return {
      total,
      executed,
      successful,
      failed,
      successRate: executed > 0 ? ((successful / executed) * 100).toFixed(1) : '0.0'
    };
  }

  /**
   * Display summary
   */
  displaySummary() {
    const duration = Date.now() - this.startTime;
    const summary = this.calculateSummary();

    console.log('');
    console.log('📊 Quick Start Summary');
    console.log('=====================');
    console.log(`Total Duration: ${(duration / 1000).toFixed(2)}s`);
    console.log(`Steps Executed: ${summary.executed}/${summary.total}`);
    console.log(`Successful: ${summary.successful}`);
    console.log(`Failed: ${summary.failed}`);
    console.log(`Success Rate: ${summary.successRate}%`);
    console.log('');

    // Show step results
    for (const step of this.steps) {
      const result = this.results[step.name];
      if (!result) {
        console.log(`⏭️  ${step.name}: Not executed`);
      } else {
        const icon = result.status === 'success' ? '✅' : '❌';
        console.log(`${icon} ${step.name}: ${result.status.toUpperCase()}`);
      }
    }

    console.log('');

    if (summary.failed > 0) {
      console.log('❌ Some steps failed. Please review the errors above and run individual scripts to fix issues.');
      console.log('');
      console.log('Manual recovery steps:');
      console.log('1. Check the error messages above');
      console.log('2. Run individual scripts to fix specific issues');
      console.log('3. Re-run this quick start script');
    } else if (summary.successful === summary.total) {
      console.log('🎉 All steps completed successfully!');
      console.log('');
      console.log('Your FloWorx production monitoring system is now fully deployed!');
      console.log('');
      console.log('Next steps:');
      console.log('1. Monitor the system for the first 24 hours');
      console.log('2. Review alert frequency and adjust thresholds if needed');
      console.log('3. Check stakeholder reports are being delivered');
      console.log('4. Start adaptive learning monitoring:');
      console.log('   node scripts/monitor-adaptive-learning.js');
    } else {
      console.log('⚠️  Deployment completed with some optional steps skipped.');
      console.log('Core monitoring functionality should be operational.');
    }
  }
}

// Handle script execution
if (require.main === module) {
  const quickStart = new QuickStartProduction();
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Quick start interrupted by user');
    process.exit(1);
  });

  process.on('SIGTERM', () => {
    console.log('\n🛑 Quick start terminated');
    process.exit(1);
  });

  // Run quick start
  quickStart.run().catch(error => {
    console.error('Quick start failed:', error.message);
    process.exit(1);
  });
}

module.exports = QuickStartProduction;
