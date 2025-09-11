#!/usr/bin/env node

/**
 * Production Configuration Validator
 * Validates all configurations before deployment
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 PRODUCTION CONFIGURATION VALIDATION');
console.log('======================================\n');

class ConfigValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.passed = [];
  }

  validate() {
    console.log('1. 📁 Checking file structure...');
    this.checkFileStructure();
    
    console.log('\n2. 🔧 Validating configurations...');
    this.validateConfigurations();
    
    console.log('\n3. 🌐 Checking for localhost references...');
    this.checkLocalhostReferences();
    
    console.log('\n4. 📧 Validating environment variables...');
    this.validateEnvironmentVariables();
    
    this.showResults();
  }

  checkFileStructure() {
    const requiredFiles = [
      'vercel.json',
      'api/index.js',
      'frontend/package.json',
      'backend/server.js',
      '.env.production'
    ];
    
    for (const file of requiredFiles) {
      if (fs.existsSync(file)) {
        console.log(`   ✅ ${file}`);
        this.passed.push(`File exists: ${file}`);
      } else {
        console.log(`   ❌ ${file} - MISSING`);
        this.errors.push(`Missing required file: ${file}`);
      }
    }
  }

  validateConfigurations() {
    // Check vercel.json
    if (fs.existsSync('vercel.json')) {
      try {
        const vercelConfig = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
        
        if (vercelConfig.env && vercelConfig.env.REACT_APP_API_URL) {
          const apiUrl = vercelConfig.env.REACT_APP_API_URL;
          if (apiUrl.includes('app.floworx-iq.com')) {
            console.log('   ✅ Vercel API URL configured for production domain');
            this.passed.push('Vercel API URL uses production domain');
          } else if (apiUrl.includes('localhost')) {
            console.log('   ❌ Vercel API URL still uses localhost');
            this.errors.push('Vercel configuration uses localhost');
          } else {
            console.log('   ⚠️  Vercel API URL uses different domain');
            this.warnings.push('Vercel API URL domain mismatch');
          }
        }
        
        if (vercelConfig.routes) {
          console.log('   ✅ Vercel routes configured');
          this.passed.push('Vercel routes configured');
        }
        
      } catch (error) {
        console.log('   ❌ Invalid vercel.json format');
        this.errors.push('Invalid vercel.json format');
      }
    }
    
    // Check package.json scripts
    if (fs.existsSync('package.json')) {
      try {
        const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        if (pkg.scripts && pkg.scripts.build) {
          console.log('   ✅ Build script configured');
          this.passed.push('Build script configured');
        } else {
          console.log('   ⚠️  No build script found');
          this.warnings.push('No build script in package.json');
        }
      } catch (error) {
        console.log('   ❌ Invalid package.json');
        this.errors.push('Invalid package.json');
      }
    }
  }

  checkLocalhostReferences() {
    const filesToCheck = [
      'test-email-auth-flow.js',
      'frontend/src/utils/apiClient.js',
      'api/index.js',
      '.env.production'
    ];
    
    for (const file of filesToCheck) {
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf8');
        const localhostMatches = content.match(/localhost:\d+/g);
        
        if (localhostMatches) {
          // Check if it's in a conditional or fallback
          if (content.includes('process.env') && content.includes('localhost')) {
            console.log(`   ⚠️  ${file} - localhost as fallback (OK)`);
            this.passed.push(`${file} uses localhost as fallback`);
          } else {
            console.log(`   ❌ ${file} - hardcoded localhost: ${localhostMatches.join(', ')}`);
            this.errors.push(`${file} contains hardcoded localhost`);
          }
        } else {
          console.log(`   ✅ ${file} - no localhost references`);
          this.passed.push(`${file} clean of localhost references`);
        }
      }
    }
  }

  validateEnvironmentVariables() {
    if (fs.existsSync('.env.production')) {
      const envContent = fs.readFileSync('.env.production', 'utf8');
      
      const requiredVars = [
        'NODE_ENV',
        'FRONTEND_URL',
        'GOOGLE_CLIENT_ID',
        'GOOGLE_REDIRECT_URI',
        'SMTP_HOST',
        'FROM_EMAIL'
      ];
      
      for (const varName of requiredVars) {
        if (envContent.includes(`${varName}=`)) {
          const line = envContent.split('\n').find(l => l.startsWith(`${varName}=`));
          const value = line ? line.split('=')[1] : '';
          
          if (value && !value.includes('your_') && !value.includes('localhost')) {
            console.log(`   ✅ ${varName} - configured`);
            this.passed.push(`${varName} configured`);
          } else {
            console.log(`   ⚠️  ${varName} - needs real value`);
            this.warnings.push(`${varName} needs real production value`);
          }
        } else {
          console.log(`   ❌ ${varName} - missing`);
          this.errors.push(`Missing environment variable: ${varName}`);
        }
      }
    }
  }

  showResults() {
    console.log('\n📊 VALIDATION RESULTS');
    console.log('=====================');
    
    console.log(`\n✅ PASSED (${this.passed.length}):`);
    this.passed.forEach(item => console.log(`   • ${item}`));
    
    if (this.warnings.length > 0) {
      console.log(`\n⚠️  WARNINGS (${this.warnings.length}):`);
      this.warnings.forEach(item => console.log(`   • ${item}`));
    }
    
    if (this.errors.length > 0) {
      console.log(`\n❌ ERRORS (${this.errors.length}):`);
      this.errors.forEach(item => console.log(`   • ${item}`));
    }
    
    console.log('\n🎯 DEPLOYMENT READINESS:');
    if (this.errors.length === 0) {
      console.log('✅ READY FOR DEPLOYMENT!');
      console.log('\nNext steps:');
      console.log('1. Run: node deploy-to-production.js');
      console.log('2. Update Google OAuth redirect URIs');
      console.log('3. Configure SendGrid domain authentication');
      console.log('4. Test production deployment');
    } else {
      console.log('❌ NOT READY - Fix errors first');
      console.log('\nFix the errors above before deploying.');
    }
    
    return this.errors.length === 0;
  }
}

// Run validation
if (require.main === module) {
  const validator = new ConfigValidator();
  const isReady = validator.validate();
  process.exit(isReady ? 0 : 1);
}

module.exports = ConfigValidator;
