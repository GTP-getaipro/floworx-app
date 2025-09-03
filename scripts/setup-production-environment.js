#!/usr/bin/env node

/**
 * Production Environment Setup Script
 * Interactive configuration of production environment variables
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const readline = require('readline');

class ProductionEnvironmentSetup {
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    this.config = {};
    this.isInteractive = !process.argv.includes('--non-interactive');
  }

  /**
   * Main setup process
   */
  async run() {
    try {
      console.log('🔧 FloWorx Production Environment Setup');
      console.log('=====================================');
      console.log('');

      // Load template
      await this.loadTemplate();

      // Configure core settings
      await this.configureCoreSettings();

      // Configure database
      await this.configureDatabaseSettings();

      // Configure security
      await this.configureSecuritySettings();

      // Configure monitoring
      await this.configureMonitoringSettings();

      // Configure alerting
      await this.configureAlertingSettings();

      // Configure reporting
      await this.configureReportingSettings();

      // Configure external services
      await this.configureExternalServices();

      // Generate final configuration
      await this.generateProductionConfig();

      console.log('');
      console.log('✅ Production environment configuration completed!');
      console.log('📄 Configuration saved to: .env.production');
      console.log('');
      console.log('Next steps:');
      console.log('1. Review the generated .env.production file');
      console.log('2. Update any placeholder values with actual credentials');
      console.log('3. Run: node scripts/deploy-production-monitoring.js --dry-run');

    } catch (error) {
      console.error('❌ Setup failed:', error.message);
      process.exit(1);
    } finally {
      this.rl.close();
    }
  }

  /**
   * Load environment template
   */
  async loadTemplate() {
    try {
      const templatePath = path.join(process.cwd(), '.env.production.template');
      const template = await fs.readFile(templatePath, 'utf8');
      
      // Parse template to extract variable names and comments
      this.templateVars = this.parseTemplate(template);
      console.log(`📋 Loaded ${Object.keys(this.templateVars).length} configuration variables`);
    } catch (error) {
      throw new Error(`Failed to load template: ${error.message}`);
    }
  }

  /**
   * Parse environment template
   */
  parseTemplate(template) {
    const vars = {};
    const lines = template.split('\n');
    let currentComment = '';

    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed.startsWith('#') && !trimmed.startsWith('# =====')) {
        currentComment = trimmed.substring(1).trim();
      } else if (trimmed.includes('=') && !trimmed.startsWith('#')) {
        const [key, value] = trimmed.split('=', 2);
        vars[key] = {
          value: value || '',
          comment: currentComment,
          required: this.isRequiredVar(key)
        };
        currentComment = '';
      }
    }

    return vars;
  }

  /**
   * Check if variable is required
   */
  isRequiredVar(key) {
    const requiredVars = [
      'NODE_ENV', 'DATABASE_URL', 'JWT_SECRET', 'ENCRYPTION_KEY',
      'SMTP_HOST', 'SMTP_USER', 'SMTP_PASSWORD'
    ];
    return requiredVars.includes(key);
  }

  /**
   * Configure core application settings
   */
  async configureCoreSettings() {
    console.log('🏗️  Configuring core application settings...');

    this.config.NODE_ENV = 'production';
    this.config.APP_VERSION = await this.prompt('App Version', '1.0.0');
    this.config.DEPLOYMENT_ID = `prod-${Date.now()}`;
    this.config.PORT = await this.prompt('Application Port', '3000');

    console.log('✅ Core settings configured');
  }

  /**
   * Configure database settings
   */
  async configureDatabaseSettings() {
    console.log('🗄️  Configuring database settings...');

    if (this.isInteractive) {
      const dbHost = await this.prompt('Database Host', 'localhost');
      const dbPort = await this.prompt('Database Port', '5432');
      const dbName = await this.prompt('Database Name', 'floworx_production');
      const dbUser = await this.prompt('Database User', 'floworx_user');
      const dbPassword = await this.promptPassword('Database Password');

      this.config.DATABASE_URL = `postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}`;
      this.config.DB_HOST = dbHost;
      this.config.DB_PORT = dbPort;
      this.config.DB_NAME = dbName;
      this.config.DB_USER = dbUser;
      this.config.DB_PASSWORD = dbPassword;
    } else {
      this.config.DATABASE_URL = 'postgresql://user:password@localhost:5432/floworx_production';
    }

    this.config.DB_SSL = 'true';
    this.config.DB_MAX_CONNECTIONS = '20';

    console.log('✅ Database settings configured');
  }

  /**
   * Configure security settings
   */
  async configureSecuritySettings() {
    console.log('🔐 Configuring security settings...');

    // Generate secure keys
    this.config.JWT_SECRET = this.generateSecureKey(64);
    this.config.ENCRYPTION_KEY = this.generateSecureKey(32);
    this.config.SESSION_SECRET = this.generateSecureKey(32);

    console.log('✅ Security keys generated');
  }

  /**
   * Configure monitoring settings
   */
  async configureMonitoringSettings() {
    console.log('📊 Configuring monitoring settings...');

    // Performance thresholds
    this.config.MONITOR_SLOW_QUERY_MS = await this.prompt('Slow Query Threshold (ms)', '500');
    this.config.MONITOR_CRITICAL_QUERY_MS = await this.prompt('Critical Query Threshold (ms)', '2000');
    this.config.MONITOR_ERROR_RATE = await this.prompt('Error Rate Threshold (0.0-1.0)', '0.02');
    this.config.MONITOR_CRITICAL_ERROR_RATE = await this.prompt('Critical Error Rate (0.0-1.0)', '0.05');

    // Business metrics
    this.config.MONITOR_ONBOARDING_FAILURE_RATE = '0.10';
    this.config.MONITOR_WORKFLOW_FAILURE_RATE = '0.05';
    this.config.MONITOR_OAUTH_FAILURE_RATE = '0.03';

    // Data retention
    this.config.MONITOR_QUERY_RETENTION_HOURS = '24';
    this.config.MONITOR_ERROR_RETENTION_DAYS = '30';
    this.config.MONITOR_PERFORMANCE_RETENTION_DAYS = '7';

    console.log('✅ Monitoring settings configured');
  }

  /**
   * Configure alerting settings
   */
  async configureAlertingSettings() {
    console.log('🚨 Configuring alerting settings...');

    // Slack configuration
    const slackEnabled = await this.promptBoolean('Enable Slack alerts?', true);
    this.config.SLACK_ALERTS_ENABLED = slackEnabled.toString();
    
    if (slackEnabled && this.isInteractive) {
      this.config.SLACK_WEBHOOK_URL = await this.prompt('Slack Webhook URL', 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK');
      this.config.SLACK_ALERT_CHANNEL = await this.prompt('Slack Alert Channel', '#floworx-alerts');
    }

    // Email configuration
    const emailEnabled = await this.promptBoolean('Enable Email alerts?', true);
    this.config.EMAIL_ALERTS_ENABLED = emailEnabled.toString();
    
    if (emailEnabled && this.isInteractive) {
      this.config.SMTP_HOST = await this.prompt('SMTP Host', 'smtp.gmail.com');
      this.config.SMTP_PORT = await this.prompt('SMTP Port', '587');
      this.config.SMTP_USER = await this.prompt('SMTP Username');
      this.config.SMTP_PASSWORD = await this.promptPassword('SMTP Password');
      this.config.ALERT_FROM_EMAIL = await this.prompt('Alert From Email', 'alerts@floworx-iq.com');
      
      // Alert recipients
      this.config.CRITICAL_ALERT_EMAILS = await this.prompt('Critical Alert Recipients (comma-separated)', 'cto@floworx-iq.com');
      this.config.HIGH_ALERT_EMAILS = await this.prompt('High Alert Recipients (comma-separated)', 'engineering@floworx-iq.com');
    }

    // PagerDuty configuration
    const pagerDutyEnabled = await this.promptBoolean('Enable PagerDuty integration?', false);
    this.config.PAGERDUTY_ENABLED = pagerDutyEnabled.toString();
    
    if (pagerDutyEnabled && this.isInteractive) {
      this.config.PAGERDUTY_INTEGRATION_KEY = await this.prompt('PagerDuty Integration Key');
    }

    console.log('✅ Alerting settings configured');
  }

  /**
   * Configure reporting settings
   */
  async configureReportingSettings() {
    console.log('📈 Configuring reporting settings...');

    this.config.REPORT_TIMEZONE = await this.prompt('Report Timezone', 'America/New_York');
    this.config.REPORT_FROM_EMAIL = await this.prompt('Report From Email', 'reports@floworx-iq.com');

    // Stakeholder email lists
    this.config.EXECUTIVE_REPORT_EMAILS = await this.prompt('Executive Report Recipients', 'ceo@floworx-iq.com');
    this.config.OPERATIONS_REPORT_EMAILS = await this.prompt('Operations Report Recipients', 'operations@floworx-iq.com');
    this.config.DEVELOPMENT_REPORT_EMAILS = await this.prompt('Development Report Recipients', 'engineering@floworx-iq.com');

    console.log('✅ Reporting settings configured');
  }

  /**
   * Configure external services
   */
  async configureExternalServices() {
    console.log('🌐 Configuring external services...');

    // N8N configuration
    const n8nEnabled = await this.promptBoolean('Configure N8N integration?', true);
    if (n8nEnabled && this.isInteractive) {
      this.config.N8N_BASE_URL = await this.prompt('N8N Base URL', 'https://your-n8n-instance.com');
      this.config.N8N_API_KEY = await this.prompt('N8N API Key');
      this.config.N8N_HEALTH_CHECK_ENABLED = 'true';
    }

    // Supabase configuration
    const supabaseEnabled = await this.promptBoolean('Configure Supabase integration?', true);
    if (supabaseEnabled && this.isInteractive) {
      this.config.SUPABASE_URL = await this.prompt('Supabase URL', 'https://your-project.supabase.co');
      this.config.SUPABASE_ANON_KEY = await this.prompt('Supabase Anon Key');
      this.config.SUPABASE_SERVICE_ROLE_KEY = await this.promptPassword('Supabase Service Role Key');
    }

    // Google OAuth
    const googleOAuthEnabled = await this.promptBoolean('Configure Google OAuth?', true);
    if (googleOAuthEnabled && this.isInteractive) {
      this.config.GOOGLE_CLIENT_ID = await this.prompt('Google Client ID');
      this.config.GOOGLE_CLIENT_SECRET = await this.promptPassword('Google Client Secret');
      this.config.GOOGLE_REDIRECT_URI = await this.prompt('Google Redirect URI', 'https://app.floworx-iq.com/auth/google/callback');
    }

    console.log('✅ External services configured');
  }

  /**
   * Generate production configuration file
   */
  async generateProductionConfig() {
    console.log('📝 Generating production configuration...');

    let configContent = '# FloWorx Production Environment Configuration\n';
    configContent += `# Generated on ${new Date().toISOString()}\n`;
    configContent += '# DO NOT COMMIT THIS FILE TO VERSION CONTROL\n\n';

    // Add configured values
    for (const [key, value] of Object.entries(this.config)) {
      configContent += `${key}=${value}\n`;
    }

    // Add remaining template variables with defaults
    configContent += '\n# Additional Configuration Variables\n';
    for (const [key, info] of Object.entries(this.templateVars)) {
      if (!this.config[key]) {
        configContent += `${key}=${info.value}\n`;
      }
    }

    // Write to file
    await fs.writeFile('.env.production', configContent);
    
    // Set secure permissions
    try {
      await fs.chmod('.env.production', 0o600);
    } catch (error) {
      console.warn('⚠️  Could not set secure file permissions');
    }

    console.log('✅ Configuration file generated');
  }

  /**
   * Generate secure random key
   */
  generateSecureKey(length) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Prompt user for input
   */
  async prompt(question, defaultValue = '') {
    if (!this.isInteractive) {
      return defaultValue;
    }

    return new Promise((resolve) => {
      const displayDefault = defaultValue ? ` (${defaultValue})` : '';
      this.rl.question(`  ${question}${displayDefault}: `, (answer) => {
        resolve(answer.trim() || defaultValue);
      });
    });
  }

  /**
   * Prompt for password (hidden input)
   */
  async promptPassword(question) {
    if (!this.isInteractive) {
      return 'CHANGE_ME_IN_PRODUCTION';
    }

    return new Promise((resolve) => {
      this.rl.question(`  ${question}: `, (answer) => {
        resolve(answer.trim() || 'CHANGE_ME_IN_PRODUCTION');
      });
    });
  }

  /**
   * Prompt for boolean input
   */
  async promptBoolean(question, defaultValue = false) {
    if (!this.isInteractive) {
      return defaultValue;
    }

    return new Promise((resolve) => {
      const defaultText = defaultValue ? 'Y/n' : 'y/N';
      this.rl.question(`  ${question} (${defaultText}): `, (answer) => {
        const response = answer.trim().toLowerCase();
        if (response === '') {
          resolve(defaultValue);
        } else {
          resolve(response === 'y' || response === 'yes');
        }
      });
    });
  }
}

// Handle script execution
if (require.main === module) {
  const setup = new ProductionEnvironmentSetup();
  setup.run().catch(error => {
    console.error('Setup failed:', error.message);
    process.exit(1);
  });
}

module.exports = ProductionEnvironmentSetup;
