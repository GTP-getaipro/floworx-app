#!/usr/bin/env node

/**
 * Production Environment Validation Script
 * Validates that all URLs and configurations are properly set for production
 */

const fs = require('fs');
const path = require('path');

class ProductionValidator {
  constructor() {
    this.productionDomain = 'app.floworx-iq.com';
    this.issues = [];
    this.warnings = [];
    this.passed = [];
  }

  async validate() {
    console.log('🔍 Validating Production Environment Configuration');
    console.log(`🌐 Expected Production Domain: ${this.productionDomain}`);
    console.log('=' .repeat(60));

    try {
      await this.validateFrontendConfig();
      await this.validateBackendConfig();
      await this.validateDiagnosticScripts();
      await this.validateApiClient();
      await this.checkForLocalhostReferences();
      
      this.generateReport();
    } catch (error) {
      console.error('❌ Validation failed:', error.message);
      process.exit(1);
    }
  }

  async validateFrontendConfig() {
    console.log('\n📱 Validating Frontend Configuration...');
    
    const frontendEnvPath = path.join(__dirname, 'frontend', '.env');
    
    if (!fs.existsSync(frontendEnvPath)) {
      this.issues.push('Frontend .env file not found');
      return;
    }

    const content = fs.readFileSync(frontendEnvPath, 'utf8');
    
    // Check if production API URL is active
    if (content.includes(`REACT_APP_API_URL=https://${this.productionDomain}/api`)) {
      console.log('   ✅ Production API URL is active');
      this.passed.push('Frontend using production API URL');
    } else {
      console.log('   ❌ Production API URL not found or not active');
      this.issues.push('Frontend not configured for production API URL');
    }

    // Check if localhost is commented out
    if (content.includes('# REACT_APP_API_URL=http://localhost:5001/api')) {
      console.log('   ✅ Development localhost URL is properly commented');
      this.passed.push('Development URL properly commented');
    } else {
      console.log('   ⚠️  Development localhost URL should be commented out');
      this.warnings.push('Development URL not commented out');
    }
  }

  async validateBackendConfig() {
    console.log('\n🔧 Validating Backend Configuration...');
    
    const backendEnvPath = path.join(__dirname, '.env');
    
    if (!fs.existsSync(backendEnvPath)) {
      this.issues.push('Backend .env file not found');
      return;
    }

    const content = fs.readFileSync(backendEnvPath, 'utf8');
    
    const requiredConfigs = [
      {
        name: 'FRONTEND_URL',
        expected: `https://${this.productionDomain}`,
        pattern: /FRONTEND_URL=(.+)/
      },
      {
        name: 'GOOGLE_REDIRECT_URI',
        expected: `https://${this.productionDomain}/api/oauth/google/callback`,
        pattern: /GOOGLE_REDIRECT_URI=(.+)/
      },
      {
        name: 'BACKEND_URL',
        expected: `https://${this.productionDomain}`,
        pattern: /BACKEND_URL=(.+)/
      }
    ];

    requiredConfigs.forEach(config => {
      const match = content.match(config.pattern);
      if (match) {
        const currentValue = match[1];
        if (currentValue === config.expected) {
          console.log(`   ✅ ${config.name}: Correctly configured`);
          this.passed.push(`${config.name} configured for production`);
        } else {
          console.log(`   ❌ ${config.name}: ${currentValue} (expected: ${config.expected})`);
          this.issues.push(`${config.name} not configured for production`);
        }
      } else {
        console.log(`   ❌ ${config.name}: Not found`);
        this.issues.push(`${config.name} missing from configuration`);
      }
    });
  }

  async validateDiagnosticScripts() {
    console.log('\n🔍 Validating Diagnostic Scripts...');
    
    const scripts = [
      'debug-user-registration.js',
      'debug-password-reset.js'
    ];

    scripts.forEach(scriptName => {
      const scriptPath = path.join(__dirname, scriptName);
      
      if (fs.existsSync(scriptPath)) {
        const content = fs.readFileSync(scriptPath, 'utf8');
        
        // Check if using production URL as fallback
        if (content.includes(`https://${this.productionDomain}/api`)) {
          console.log(`   ✅ ${scriptName}: Using production URL as fallback`);
          this.passed.push(`${scriptName} configured for production`);
        } else {
          console.log(`   ❌ ${scriptName}: Not using production URL as fallback`);
          this.issues.push(`${scriptName} not configured for production`);
        }
      } else {
        console.log(`   ⚠️  ${scriptName}: File not found`);
        this.warnings.push(`${scriptName} not found`);
      }
    });
  }

  async validateApiClient() {
    console.log('\n🌐 Validating API Client Configuration...');
    
    const apiClientPath = path.join(__dirname, 'frontend', 'src', 'utils', 'apiClient.js');
    
    if (fs.existsSync(apiClientPath)) {
      const content = fs.readFileSync(apiClientPath, 'utf8');
      
      // Check if using environment variable with production fallback
      if (content.includes(`process.env.REACT_APP_API_URL || 'https://${this.productionDomain}/api'`)) {
        console.log('   ✅ API Client: Using production URL as fallback');
        this.passed.push('API Client configured for production');
      } else if (content.includes('process.env.REACT_APP_API_URL')) {
        console.log('   ✅ API Client: Using environment variable (will use frontend .env)');
        this.passed.push('API Client using environment variable');
      } else {
        console.log('   ❌ API Client: Not properly configured');
        this.issues.push('API Client not configured for production');
      }
    } else {
      console.log('   ⚠️  API Client file not found');
      this.warnings.push('API Client file not found');
    }
  }

  async checkForLocalhostReferences() {
    console.log('\n🔍 Checking for Localhost References...');
    
    const filesToCheck = [
      'frontend/.env',
      '.env',
      'debug-user-registration.js',
      'debug-password-reset.js',
      'frontend/src/utils/apiClient.js',
      'frontend/src/hooks/useApi.js',
      'frontend/src/hooks/useApiRequest.js'
    ];

    filesToCheck.forEach(filePath => {
      const fullPath = path.join(__dirname, filePath);
      
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        
        // Find active localhost references (not in comments)
        const lines = content.split('\n');
        const activeLocalhostLines = lines
          .map((line, index) => ({ line: line.trim(), number: index + 1 }))
          .filter(({ line }) => 
            line.includes('localhost') && 
            !line.startsWith('#') && 
            !line.startsWith('//') &&
            !line.includes('commented out') &&
            !line.includes('development') &&
            line.includes('=')
          );

        if (activeLocalhostLines.length > 0) {
          console.log(`   ⚠️  ${filePath}: Found active localhost references:`);
          activeLocalhostLines.forEach(({ line, number }) => {
            console.log(`      Line ${number}: ${line}`);
          });
          this.warnings.push(`${filePath} contains active localhost references`);
        } else {
          console.log(`   ✅ ${filePath}: No active localhost references`);
          this.passed.push(`${filePath} clean of localhost references`);
        }
      } else {
        console.log(`   ℹ️  ${filePath}: File not found (optional)`);
      }
    });
  }

  generateReport() {
    console.log('\n📊 VALIDATION REPORT');
    console.log('=' .repeat(60));
    
    console.log(`\n✅ Passed Checks (${this.passed.length}):`);
    if (this.passed.length === 0) {
      console.log('   None');
    } else {
      this.passed.forEach(item => console.log(`   ✅ ${item}`));
    }

    if (this.warnings.length > 0) {
      console.log(`\n⚠️  Warnings (${this.warnings.length}):`);
      this.warnings.forEach(warning => console.log(`   ⚠️  ${warning}`));
    }

    if (this.issues.length > 0) {
      console.log(`\n❌ Issues Found (${this.issues.length}):`);
      this.issues.forEach(issue => console.log(`   ❌ ${issue}`));
    }

    console.log('\n🎯 Production Configuration Status:');
    if (this.issues.length === 0) {
      console.log('   🎉 All critical configurations are correct for production!');
      console.log(`   🌐 Ready to deploy to: https://${this.productionDomain}`);
    } else {
      console.log('   ⚠️  Some configurations need to be fixed before production deployment');
      console.log('   🔧 Run: node configure-production-urls.js');
    }

    console.log('\n📋 Deployment Checklist:');
    console.log('   □ All URLs point to app.floworx-iq.com');
    console.log('   □ No active localhost references');
    console.log('   □ OAuth callbacks configured for production');
    console.log('   □ Environment variables set in Coolify');
    console.log('   □ DNS records point to Coolify server');

    if (this.issues.length > 0) {
      process.exit(1);
    }
  }
}

// Main execution
async function main() {
  const validator = new ProductionValidator();
  await validator.validate();
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { ProductionValidator };
