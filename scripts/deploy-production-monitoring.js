#!/usr/bin/env node

/**
 * Production Monitoring Deployment Script
 * Deploys and configures all monitoring services for FloWorx production environment
 */

const productionDeploymentOrchestrator = require('../backend/services/productionDeploymentOrchestrator');
const logger = require('../backend/utils/logger');

class ProductionDeploymentScript {
  constructor() {
    this.deploymentStartTime = Date.now();
    this.verbose = process.argv.includes('--verbose') || process.argv.includes('-v');
    this.dryRun = process.argv.includes('--dry-run');
    this.skipHealthChecks = process.argv.includes('--skip-health-checks');
  }

  /**
   * Main deployment execution
   */
  async run() {
    try {
      console.log('🚀 FloWorx Production Monitoring Deployment');
      console.log('==========================================');
      console.log(`Environment: ${process.env.NODE_ENV || 'production'}`);
      console.log(`Version: ${process.env.APP_VERSION || '1.0.0'}`);
      console.log(`Timestamp: ${new Date().toISOString()}`);
      console.log('');

      if (this.dryRun) {
        console.log('🔍 DRY RUN MODE - No actual changes will be made');
        console.log('');
      }

      // Pre-deployment checks
      await this.preDeploymentChecks();

      if (this.dryRun) {
        console.log('✅ Dry run completed successfully');
        return;
      }

      // Set up event listeners for deployment progress
      this.setupDeploymentListeners();

      // Execute deployment
      const deploymentResult = await productionDeploymentOrchestrator.deployToProduction();

      // Post-deployment actions
      await this.postDeploymentActions(deploymentResult);

      console.log('');
      console.log('🎉 Production monitoring deployment completed successfully!');
      console.log(`Total deployment time: ${((Date.now() - this.deploymentStartTime) / 1000).toFixed(2)}s`);

    } catch (error) {
      console.error('');
      console.error('❌ Deployment failed:', error.message);
      
      if (this.verbose) {
        console.error('Stack trace:', error.stack);
      }

      // Attempt cleanup
      await this.cleanupOnFailure();

      process.exit(1);
    }
  }

  /**
   * Pre-deployment checks
   */
  async preDeploymentChecks() {
    console.log('🔍 Running pre-deployment checks...');

    // Check Node.js version
    const nodeVersion = process.version;
    const requiredVersion = '16.0.0';
    if (!this.isVersionCompatible(nodeVersion, requiredVersion)) {
      throw new Error(`Node.js version ${requiredVersion} or higher required. Current: ${nodeVersion}`);
    }

    // Check environment variables
    await this.checkEnvironmentVariables();

    // Check system resources
    await this.checkSystemResources();

    // Check external dependencies
    if (!this.skipHealthChecks) {
      await this.checkExternalDependencies();
    }

    console.log('✅ Pre-deployment checks passed');
    console.log('');
  }

  /**
   * Check required environment variables
   */
  async checkEnvironmentVariables() {
    const requiredVars = [
      'NODE_ENV',
      'DATABASE_URL',
      'JWT_SECRET',
      'ENCRYPTION_KEY'
    ];

    const optionalVars = [
      'SLACK_WEBHOOK_URL',
      'SMTP_HOST',
      'SMTP_USER',
      'SMTP_PASSWORD',
      'PAGERDUTY_INTEGRATION_KEY',
      'SENTRY_DSN',
      'N8N_BASE_URL'
    ];

    console.log('  📋 Checking environment variables...');

    // Check required variables
    const missingRequired = requiredVars.filter(varName => !process.env[varName]);
    if (missingRequired.length > 0) {
      throw new Error(`Missing required environment variables: ${missingRequired.join(', ')}`);
    }

    // Report optional variables
    const missingOptional = optionalVars.filter(varName => !process.env[varName]);
    if (missingOptional.length > 0 && this.verbose) {
      console.log(`  ⚠️  Optional variables not set: ${missingOptional.join(', ')}`);
    }

    console.log(`  ✅ Environment variables validated (${requiredVars.length} required, ${optionalVars.length - missingOptional.length} optional)`);
  }

  /**
   * Check system resources
   */
  async checkSystemResources() {
    console.log('  💻 Checking system resources...');

    const memoryUsage = process.memoryUsage();
    const freeMemory = require('os').freemem();
    const totalMemory = require('os').totalmem();

    // Check available memory (require at least 512MB free)
    const requiredMemoryMB = 512;
    const freeMemoryMB = freeMemory / (1024 * 1024);

    if (freeMemoryMB < requiredMemoryMB) {
      throw new Error(`Insufficient memory. Required: ${requiredMemoryMB}MB, Available: ${freeMemoryMB.toFixed(0)}MB`);
    }

    if (this.verbose) {
      console.log(`  📊 Memory: ${(freeMemoryMB / 1024).toFixed(1)}GB free of ${(totalMemory / (1024 * 1024 * 1024)).toFixed(1)}GB total`);
    }

    console.log('  ✅ System resources sufficient');
  }

  /**
   * Check external dependencies
   */
  async checkExternalDependencies() {
    console.log('  🌐 Checking external dependencies...');

    const checks = [];

    // Database connectivity
    checks.push(this.checkDatabase());

    // N8N connectivity (if configured)
    if (process.env.N8N_BASE_URL) {
      checks.push(this.checkN8N());
    }

    // Email service (if configured)
    if (process.env.SMTP_HOST) {
      checks.push(this.checkEmailService());
    }

    await Promise.all(checks);
    console.log('  ✅ External dependencies verified');
  }

  /**
   * Check database connectivity
   */
  async checkDatabase() {
    try {
      const { query } = require('../backend/database/unified-connection');
      await query('SELECT 1 as health_check');
      
      if (this.verbose) {
        console.log('  🗄️  Database connection verified');
      }
    } catch (error) {
      throw new Error(`Database connection failed: ${error.message}`);
    }
  }

  /**
   * Check N8N connectivity
   */
  async checkN8N() {
    try {
      const axios = require('axios');
      const response = await axios.get(`${process.env.N8N_BASE_URL}/healthz`, {
        timeout: 10000,
        headers: {
          'X-N8N-API-KEY': process.env.N8N_API_KEY
        }
      });

      if (response.status === 200) {
        if (this.verbose) {
          console.log('  🔄 N8N service connection verified');
        }
      }
    } catch (error) {
      console.warn(`  ⚠️  N8N service check failed: ${error.message}`);
    }
  }

  /**
   * Check email service
   */
  async checkEmailService() {
    try {
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_PORT === '465',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD
        }
      });

      await transporter.verify();
      
      if (this.verbose) {
        console.log('  📧 Email service connection verified');
      }
    } catch (error) {
      console.warn(`  ⚠️  Email service check failed: ${error.message}`);
    }
  }

  /**
   * Setup deployment event listeners
   */
  setupDeploymentListeners() {
    productionDeploymentOrchestrator.on('deployment:phase:started', (data) => {
      console.log(`📋 Phase ${data.index + 1}/8: ${data.phase}`);
    });

    productionDeploymentOrchestrator.on('deployment:phase:completed', (data) => {
      console.log(`✅ Phase ${data.index + 1}/8 completed: ${data.phase}`);
    });

    if (this.verbose) {
      productionDeploymentOrchestrator.on('deployment:started', () => {
        console.log('🚀 Deployment started');
      });

      productionDeploymentOrchestrator.on('deployment:completed', (data) => {
        console.log(`🎉 Deployment completed in ${data.duration}ms`);
      });
    }
  }

  /**
   * Post-deployment actions
   */
  async postDeploymentActions(deploymentResult) {
    console.log('');
    console.log('📊 Post-deployment summary:');
    console.log(`  Services deployed: ${Object.keys(deploymentResult.services).length}`);
    console.log(`  Deployment duration: ${((deploymentResult.completionTime - deploymentResult.startTime) / 1000).toFixed(2)}s`);
    
    if (deploymentResult.errors.length > 0) {
      console.log(`  Errors encountered: ${deploymentResult.errors.length}`);
      if (this.verbose) {
        deploymentResult.errors.forEach((error, index) => {
          console.log(`    ${index + 1}. ${error.phase}: ${error.error}`);
        });
      }
    }

    // Generate deployment report
    await this.generateDeploymentReport(deploymentResult);

    // Send deployment notification
    await this.sendDeploymentNotification(deploymentResult);
  }

  /**
   * Generate deployment report
   */
  async generateDeploymentReport(deploymentResult) {
    const reportPath = `./reports/deployment-${Date.now()}.json`;
    
    try {
      const fs = require('fs').promises;
      await fs.mkdir('./reports', { recursive: true });
      
      const report = {
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        version: process.env.APP_VERSION,
        deployment: deploymentResult,
        system: {
          nodeVersion: process.version,
          platform: process.platform,
          memory: process.memoryUsage()
        }
      };

      await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
      console.log(`📄 Deployment report saved: ${reportPath}`);
    } catch (error) {
      console.warn(`⚠️  Failed to save deployment report: ${error.message}`);
    }
  }

  /**
   * Send deployment notification
   */
  async sendDeploymentNotification(deploymentResult) {
    if (process.env.SLACK_WEBHOOK_URL) {
      try {
        const axios = require('axios');
        const message = {
          text: `🚀 FloWorx Production Monitoring Deployed`,
          attachments: [{
            color: deploymentResult.errors.length > 0 ? 'warning' : 'good',
            fields: [
              {
                title: 'Environment',
                value: process.env.NODE_ENV,
                short: true
              },
              {
                title: 'Duration',
                value: `${((deploymentResult.completionTime - deploymentResult.startTime) / 1000).toFixed(2)}s`,
                short: true
              },
              {
                title: 'Services',
                value: Object.keys(deploymentResult.services).length.toString(),
                short: true
              },
              {
                title: 'Status',
                value: deploymentResult.errors.length > 0 ? 'Completed with warnings' : 'Success',
                short: true
              }
            ]
          }]
        };

        await axios.post(process.env.SLACK_WEBHOOK_URL, message);
        console.log('📱 Deployment notification sent to Slack');
      } catch (error) {
        console.warn(`⚠️  Failed to send Slack notification: ${error.message}`);
      }
    }
  }

  /**
   * Cleanup on failure
   */
  async cleanupOnFailure() {
    console.log('🧹 Attempting cleanup after failure...');
    
    try {
      await productionDeploymentOrchestrator.shutdown();
      console.log('✅ Cleanup completed');
    } catch (error) {
      console.error('❌ Cleanup failed:', error.message);
    }
  }

  /**
   * Check if version is compatible
   */
  isVersionCompatible(current, required) {
    const currentParts = current.replace('v', '').split('.').map(Number);
    const requiredParts = required.split('.').map(Number);

    for (let i = 0; i < requiredParts.length; i++) {
      if (currentParts[i] > requiredParts[i]) return true;
      if (currentParts[i] < requiredParts[i]) return false;
    }
    return true;
  }
}

// Handle script execution
if (require.main === module) {
  const script = new ProductionDeploymentScript();
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Deployment interrupted by user');
    await script.cleanupOnFailure();
    process.exit(1);
  });

  process.on('SIGTERM', async () => {
    console.log('\n🛑 Deployment terminated');
    await script.cleanupOnFailure();
    process.exit(1);
  });

  // Run deployment
  script.run().catch(error => {
    console.error('Fatal error:', error.message);
    process.exit(1);
  });
}

module.exports = ProductionDeploymentScript;
