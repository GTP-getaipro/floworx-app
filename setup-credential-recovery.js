#!/usr/bin/env node

/**
 * Floworx Credential Recovery System Setup Script
 * 
 * This script helps set up and test the credential recovery system
 * Run with: node setup-credential-recovery.js
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class CredentialRecoverySetup {
  constructor() {
    this.envFile = '.env';
    this.requiredEnvVars = [
      'ENCRYPTION_KEY',
      'SMTP_HOST',
      'SMTP_PORT',
      'SMTP_USER',
      'SMTP_PASS',
      'FROM_NAME',
      'FROM_EMAIL',
      'FRONTEND_URL',
      'JWT_SECRET'
    ];
  }

  /**
   * Main setup process
   */
  async run() {
    console.log('🔐 Floworx Credential Recovery System Setup\n');
    
    try {
      await this.checkPrerequisites();
      await this.generateEncryptionKey();
      await this.validateEnvironment();
      await this.testDatabaseConnection();
      await this.testEmailConfiguration();
      await this.runSecurityChecks();
      
      console.log('\n✅ Setup completed successfully!');
      console.log('\n📋 Next Steps:');
      console.log('1. Run the database migration: database-migration-password-reset.sql');
      console.log('2. Deploy the updated backend and frontend');
      console.log('3. Test the password reset flow');
      console.log('4. Monitor the security audit logs');
      
    } catch (error) {
      console.error('\n❌ Setup failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * Check prerequisites
   */
  async checkPrerequisites() {
    console.log('🔍 Checking prerequisites...');
    
    // Check if required files exist
    const requiredFiles = [
      'backend/services/passwordResetService.js',
      'backend/services/accountRecoveryService.js',
      'backend/services/encryptionService.js',
      'frontend/src/components/ForgotPassword.js',
      'frontend/src/components/ResetPassword.js',
      'database-migration-password-reset.sql'
    ];

    for (const file of requiredFiles) {
      if (!fs.existsSync(file)) {
        throw new Error(`Required file missing: ${file}`);
      }
    }

    console.log('✅ All required files present');
  }

  /**
   * Generate encryption key if not present
   */
  async generateEncryptionKey() {
    console.log('🔑 Checking encryption key...');
    
    const envContent = fs.existsSync(this.envFile) ? fs.readFileSync(this.envFile, 'utf8') : '';
    
    if (!envContent.includes('ENCRYPTION_KEY=') || envContent.includes('ENCRYPTION_KEY=your_64_character_hex_encryption_key_here')) {
      const encryptionKey = crypto.randomBytes(32).toString('hex');
      
      console.log('🔐 Generated new encryption key');
      console.log('⚠️  CRITICAL: Save this key securely - losing it will make encrypted data unrecoverable');
      console.log(`ENCRYPTION_KEY=${encryptionKey}`);
      
      // Update .env file
      let updatedEnvContent = envContent;
      if (envContent.includes('ENCRYPTION_KEY=')) {
        updatedEnvContent = envContent.replace(/ENCRYPTION_KEY=.*/, `ENCRYPTION_KEY=${encryptionKey}`);
      } else {
        updatedEnvContent += `\n# Credential Recovery Encryption Key\nENCRYPTION_KEY=${encryptionKey}\n`;
      }
      
      fs.writeFileSync(this.envFile, updatedEnvContent);
      console.log('✅ Encryption key added to .env file');
    } else {
      console.log('✅ Encryption key already configured');
    }
  }

  /**
   * Validate environment variables
   */
  async validateEnvironment() {
    console.log('🌍 Validating environment variables...');
    
    const envContent = fs.readFileSync(this.envFile, 'utf8');
    const missingVars = [];
    
    for (const varName of this.requiredEnvVars) {
      if (!envContent.includes(`${varName}=`) || envContent.includes(`${varName}=your_`)) {
        missingVars.push(varName);
      }
    }
    
    if (missingVars.length > 0) {
      console.log('⚠️  Missing or incomplete environment variables:');
      missingVars.forEach(varName => {
        console.log(`   - ${varName}`);
      });
      
      // Provide example values
      console.log('\n📝 Example configuration:');
      console.log('SMTP_HOST=smtp.gmail.com');
      console.log('SMTP_PORT=587');
      console.log('SMTP_USER=your_email@gmail.com');
      console.log('SMTP_PASS=your_app_password');
      console.log('FROM_NAME=Floworx Team');
      console.log('FROM_EMAIL=noreply@floworx-iq.com');
      console.log('FRONTEND_URL=https://app.floworx-iq.com');
      
      throw new Error('Please configure missing environment variables');
    }
    
    console.log('✅ All environment variables configured');
  }

  /**
   * Test database connection
   */
  async testDatabaseConnection() {
    console.log('🗄️  Testing database connection...');
    
    try {
      // Try to require the database connection
      const { pool } = require('./backend/database/connection');
      
      // Test query
      const result = await pool.query('SELECT 1 as test');
      
      if (result.rows[0].test === 1) {
        console.log('✅ Database connection successful');
      } else {
        throw new Error('Database query returned unexpected result');
      }
    } catch (error) {
      console.log('❌ Database connection failed:', error.message);
      console.log('📝 Make sure your database is running and connection string is correct');
      throw error;
    }
  }

  /**
   * Test email configuration
   */
  async testEmailConfiguration() {
    console.log('📧 Testing email configuration...');
    
    try {
      const emailService = require('./backend/services/emailService');
      
      // Test email transporter
      await emailService.transporter.verify();
      console.log('✅ Email configuration valid');
      
    } catch (error) {
      console.log('❌ Email configuration failed:', error.message);
      console.log('📝 Check your SMTP settings and credentials');
      throw error;
    }
  }

  /**
   * Run security checks
   */
  async runSecurityChecks() {
    console.log('🔒 Running security checks...');
    
    try {
      // Test encryption service
      const encryptionService = require('./backend/services/encryptionService');
      const isValid = await encryptionService.validateKey();
      
      if (!isValid) {
        throw new Error('Encryption key validation failed');
      }
      
      console.log('✅ Encryption service working correctly');
      
      // Test password reset service
      const passwordResetService = require('./backend/services/passwordResetService');
      const testToken = passwordResetService.generateResetToken();
      
      if (testToken.length !== 64) { // 32 bytes = 64 hex chars
        throw new Error('Password reset token generation failed');
      }
      
      console.log('✅ Password reset service working correctly');
      
    } catch (error) {
      console.log('❌ Security check failed:', error.message);
      throw error;
    }
  }

  /**
   * Generate test data for development
   */
  async generateTestData() {
    console.log('🧪 Generating test data...');
    
    const testData = {
      testUser: {
        email: 'test@floworx-iq.com',
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User'
      },
      testTokens: {
        resetToken: crypto.randomBytes(32).toString('hex'),
        recoveryToken: crypto.randomBytes(32).toString('hex')
      },
      backupCodes: []
    };
    
    // Generate backup codes
    for (let i = 0; i < 10; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      testData.backupCodes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
    }
    
    fs.writeFileSync('test-data.json', JSON.stringify(testData, null, 2));
    console.log('✅ Test data generated in test-data.json');
  }
}

/**
 * CLI interface
 */
async function main() {
  const args = process.argv.slice(2);
  const setup = new CredentialRecoverySetup();
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log('Floworx Credential Recovery Setup Script');
    console.log('');
    console.log('Usage: node setup-credential-recovery.js [options]');
    console.log('');
    console.log('Options:');
    console.log('  --help, -h     Show this help message');
    console.log('  --test-data    Generate test data for development');
    console.log('  --key-only     Only generate encryption key');
    console.log('');
    return;
  }
  
  if (args.includes('--test-data')) {
    await setup.generateTestData();
    return;
  }
  
  if (args.includes('--key-only')) {
    await setup.generateEncryptionKey();
    return;
  }
  
  await setup.run();
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Setup failed:', error);
    process.exit(1);
  });
}

module.exports = CredentialRecoverySetup;
