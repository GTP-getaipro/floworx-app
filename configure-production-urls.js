#!/usr/bin/env node

/**
 * Production URL Configuration Script
 * Ensures all URLs are properly configured for production deployment
 */

const fs = require('fs');
const path = require('path');

class ProductionUrlConfigurator {
  constructor() {
    this.productionDomain = 'app.floworx-iq.com';
    this.changes = [];
    this.errors = [];
  }

  async configure() {
    console.log('🚀 Configuring URLs for Production Deployment');
    console.log(`🌐 Production Domain: ${this.productionDomain}`);
    console.log('=' .repeat(60));

    try {
      await this.updateFrontendEnv();
      await this.updateBackendEnv();
      await this.updateDiagnosticScripts();
      await this.validateConfiguration();
      
      this.generateReport();
    } catch (error) {
      console.error('❌ Configuration failed:', error.message);
      process.exit(1);
    }
  }

  async updateFrontendEnv() {
    console.log('\n📱 Updating Frontend Environment...');
    
    const frontendEnvPath = path.join(__dirname, 'frontend', '.env');
    
    if (!fs.existsSync(frontendEnvPath)) {
      console.log('⚠️  Frontend .env not found, creating...');
    }

    const productionConfig = `# API Configuration
# Production API URL (ACTIVE for production deployment)
REACT_APP_API_URL=https://${this.productionDomain}/api

# Local development (commented out for production)
# REACT_APP_API_URL=http://localhost:5001/api

# Build Configuration
GENERATE_SOURCEMAP=false
REACT_APP_VERSION=1.0.0
REACT_APP_ENVIRONMENT=production
`;

    fs.writeFileSync(frontendEnvPath, productionConfig);
    this.changes.push('✅ Updated frontend/.env for production');
    console.log('   ✅ Frontend .env configured for production');
  }

  async updateBackendEnv() {
    console.log('\n🔧 Validating Backend Environment...');
    
    const backendEnvPath = path.join(__dirname, '.env');
    
    if (!fs.existsSync(backendEnvPath)) {
      this.errors.push('❌ Backend .env file not found');
      return;
    }

    const envContent = fs.readFileSync(backendEnvPath, 'utf8');
    
    // Check critical production URLs
    const checks = [
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

    let needsUpdate = false;
    let updatedContent = envContent;

    checks.forEach(check => {
      const match = envContent.match(check.pattern);
      if (match) {
        const currentValue = match[1];
        if (currentValue !== check.expected) {
          console.log(`   ⚠️  ${check.name}: ${currentValue} → ${check.expected}`);
          updatedContent = updatedContent.replace(check.pattern, `${check.name}=${check.expected}`);
          needsUpdate = true;
        } else {
          console.log(`   ✅ ${check.name}: Already configured correctly`);
        }
      } else {
        console.log(`   ⚠️  ${check.name}: Not found, adding...`);
        updatedContent += `\n${check.name}=${check.expected}`;
        needsUpdate = true;
      }
    });

    if (needsUpdate) {
      fs.writeFileSync(backendEnvPath, updatedContent);
      this.changes.push('✅ Updated backend .env for production');
    } else {
      this.changes.push('✅ Backend .env already configured correctly');
    }
  }

  async updateDiagnosticScripts() {
    console.log('\n🔍 Updating Diagnostic Scripts...');
    
    const scriptsToUpdate = [
      {
        path: 'debug-user-registration.js',
        pattern: /apiUrl: process\.env\.API_URL \|\| 'http:\/\/localhost:5001\/api'/,
        replacement: `apiUrl: process.env.API_URL || 'https://${this.productionDomain}/api'`
      },
      {
        path: 'debug-password-reset.js',
        pattern: /apiUrl: process\.env\.REACT_APP_API_URL \|\| 'http:\/\/localhost:5001\/api'/,
        replacement: `apiUrl: process.env.API_URL || 'https://${this.productionDomain}/api'`
      }
    ];

    scriptsToUpdate.forEach(script => {
      const scriptPath = path.join(__dirname, script.path);
      
      if (fs.existsSync(scriptPath)) {
        let content = fs.readFileSync(scriptPath, 'utf8');
        
        if (script.pattern.test(content)) {
          content = content.replace(script.pattern, script.replacement);
          fs.writeFileSync(scriptPath, content);
          console.log(`   ✅ Updated ${script.path}`);
          this.changes.push(`✅ Updated ${script.path} for production`);
        } else {
          console.log(`   ℹ️  ${script.path}: No localhost references found`);
        }
      } else {
        console.log(`   ⚠️  ${script.path}: File not found`);
      }
    });
  }

  async validateConfiguration() {
    console.log('\n🔍 Validating Configuration...');
    
    const filesToCheck = [
      'frontend/.env',
      '.env',
      'debug-user-registration.js',
      'debug-password-reset.js'
    ];

    filesToCheck.forEach(filePath => {
      const fullPath = path.join(__dirname, filePath);
      
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        
        // Check for localhost references (excluding comments)
        const lines = content.split('\n');
        const localhostLines = lines
          .map((line, index) => ({ line: line.trim(), number: index + 1 }))
          .filter(({ line }) => 
            line.includes('localhost') && 
            !line.startsWith('#') && 
            !line.startsWith('//') &&
            !line.includes('commented out')
          );

        if (localhostLines.length > 0) {
          console.log(`   ⚠️  ${filePath}: Found localhost references:`);
          localhostLines.forEach(({ line, number }) => {
            console.log(`      Line ${number}: ${line}`);
          });
          this.errors.push(`${filePath} contains active localhost references`);
        } else {
          console.log(`   ✅ ${filePath}: No active localhost references`);
        }
      } else {
        console.log(`   ⚠️  ${filePath}: File not found`);
      }
    });
  }

  generateReport() {
    console.log('\n📊 CONFIGURATION REPORT');
    console.log('=' .repeat(60));
    
    console.log('\n✅ Changes Made:');
    if (this.changes.length === 0) {
      console.log('   No changes were needed - configuration already correct');
    } else {
      this.changes.forEach(change => console.log(`   ${change}`));
    }

    if (this.errors.length > 0) {
      console.log('\n❌ Issues Found:');
      this.errors.forEach(error => console.log(`   ${error}`));
    }

    console.log('\n🎯 Production URLs Configured:');
    console.log(`   Frontend: https://${this.productionDomain}`);
    console.log(`   Backend API: https://${this.productionDomain}/api`);
    console.log(`   OAuth Callback: https://${this.productionDomain}/api/oauth/google/callback`);

    console.log('\n📋 Next Steps:');
    console.log('   1. Commit these changes to your repository');
    console.log('   2. Deploy to production (Coolify will use these settings)');
    console.log('   3. Test all endpoints with production URLs');
    console.log('   4. Verify OAuth callbacks work with production domain');

    if (this.errors.length > 0) {
      console.log('\n⚠️  Please fix the issues above before deploying to production');
      process.exit(1);
    } else {
      console.log('\n🎉 Configuration complete! Ready for production deployment.');
    }
  }
}

// Create development environment configuration
function createDevelopmentConfig() {
  console.log('\n🔧 Creating Development Configuration...');
  
  const devEnvPath = path.join(__dirname, 'frontend', '.env.development');
  const devConfig = `# API Configuration for Development
REACT_APP_API_URL=http://localhost:5001/api

# Development-specific settings
REACT_APP_ENVIRONMENT=development
GENERATE_SOURCEMAP=true
REACT_APP_DEBUG=true
`;

  fs.writeFileSync(devEnvPath, devConfig);
  console.log('   ✅ Created frontend/.env.development for local development');
}

// Main execution
async function main() {
  const configurator = new ProductionUrlConfigurator();
  
  // Check if we should create development config
  const args = process.argv.slice(2);
  if (args.includes('--dev')) {
    createDevelopmentConfig();
    return;
  }
  
  await configurator.configure();
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { ProductionUrlConfigurator };
