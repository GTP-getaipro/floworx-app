#!/usr/bin/env node

/**
 * Debug API Double Path Issue
 * 
 * This script investigates and debugs the /api/api/ double path issue
 * by checking all possible sources and configurations
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

class APIDoublePathDebugger {
  constructor() {
    this.issues = [];
    this.fixes = [];
    this.productionUrl = 'app.floworx-iq.com';
  }

  async debugDoublePathIssue() {
    console.log('🔍 DEBUGGING API DOUBLE PATH ISSUE');
    console.log('=' .repeat(60));
    console.log(`🎯 Target: https://${this.productionUrl}\n`);

    // Step 1: Check all configuration files
    await this.checkConfigurationFiles();

    // Step 2: Check Docker and deployment configs
    await this.checkDeploymentConfigs();

    // Step 3: Test current production behavior
    await this.testProductionBehavior();

    // Step 4: Check build artifacts
    await this.checkBuildArtifacts();

    // Display results and recommendations
    this.displayResults();
  }

  async checkConfigurationFiles() {
    console.log('📁 CHECKING CONFIGURATION FILES');
    console.log('-' .repeat(40));

    const configFiles = [
      'frontend/.env.production',
      'frontend/.env.development',
      'frontend/src/contexts/AuthContext.js',
      'frontend/src/utils/apiClient.js',
      'frontend/src/services/api.js',
      'frontend/src/test-api-endpoints.js'
    ];

    for (const file of configFiles) {
      await this.checkFile(file);
    }
    console.log('');
  }

  async checkDeploymentConfigs() {
    console.log('🐳 CHECKING DEPLOYMENT CONFIGURATIONS');
    console.log('-' .repeat(40));

    const deploymentFiles = [
      'Dockerfile',
      'docker-compose.yml',
      '.nixpacks.toml',
      'nixpacks.toml',
      'COOLIFY_COMPLETE_FIX.md'
    ];

    for (const file of deploymentFiles) {
      await this.checkFile(file);
    }
    console.log('');
  }

  async checkFile(filePath) {
    try {
      if (!fs.existsSync(filePath)) {
        console.log(`   ⚠️  ${filePath}: File not found`);
        return;
      }

      const content = fs.readFileSync(filePath, 'utf8');
      
      // Check for problematic patterns
      const problematicPatterns = [
        'app.floworx-iq.com/api',
        '/api/api/',
        'REACT_APP_API_URL=https://app.floworx-iq.com/api'
      ];

      let hasIssues = false;
      for (const pattern of problematicPatterns) {
        if (content.includes(pattern)) {
          console.log(`   ❌ ${filePath}: Contains "${pattern}"`);
          this.issues.push({
            file: filePath,
            pattern: pattern,
            type: 'configuration'
          });
          hasIssues = true;
        }
      }

      // Check for correct patterns
      const correctPatterns = [
        'REACT_APP_API_URL=https://app.floworx-iq.com',
        'https://app.floworx-iq.com\''
      ];

      let hasCorrectConfig = false;
      for (const pattern of correctPatterns) {
        if (content.includes(pattern)) {
          hasCorrectConfig = true;
          break;
        }
      }

      if (!hasIssues && hasCorrectConfig) {
        console.log(`   ✅ ${filePath}: Configuration looks correct`);
      } else if (!hasIssues && !hasCorrectConfig) {
        console.log(`   ⚠️  ${filePath}: No API URL configuration found`);
      }

    } catch (error) {
      console.log(`   ❌ ${filePath}: Error reading file - ${error.message}`);
    }
  }

  async testProductionBehavior() {
    console.log('🌐 TESTING PRODUCTION BEHAVIOR');
    console.log('-' .repeat(40));

    // Test the problematic path
    const erroneousResult = await this.makeRequest('/api/api/auth/register', 'POST', {
      email: 'debug-test@example.com',
      password: 'DebugTest123!'
    });

    console.log(`   Erroneous Path (/api/api/auth/register): ${erroneousResult.statusCode} ${erroneousResult.statusMessage}`);
    
    if (erroneousResult.statusCode === 404) {
      console.log('   ✅ Expected: Erroneous path correctly returns 404');
    } else {
      console.log('   ⚠️  Unexpected: Erroneous path should return 404');
    }

    // Test the correct path
    const correctResult = await this.makeRequest('/api/auth/register', 'POST', {
      email: 'debug-test@example.com',
      password: 'DebugTest123!'
    });

    console.log(`   Correct Path (/api/auth/register): ${correctResult.statusCode} ${correctResult.statusMessage}`);
    
    if (correctResult.statusCode === 201 || correctResult.statusCode === 409) {
      console.log('   ✅ Expected: Correct path working properly');
    } else {
      console.log('   ❌ Issue: Correct path should return 201 or 409');
    }

    console.log('');
  }

  async checkBuildArtifacts() {
    console.log('🏗️  CHECKING BUILD ARTIFACTS');
    console.log('-' .repeat(40));

    // Check if build directory exists
    const buildDir = 'frontend/build';
    if (fs.existsSync(buildDir)) {
      console.log('   ✅ Build directory exists');
      
      // Check for static files
      const staticDir = path.join(buildDir, 'static', 'js');
      if (fs.existsSync(staticDir)) {
        const jsFiles = fs.readdirSync(staticDir).filter(f => f.endsWith('.js'));
        console.log(`   📦 Found ${jsFiles.length} JavaScript files in build`);
        
        // Check if any contain the problematic URL
        for (const file of jsFiles.slice(0, 3)) { // Check first 3 files
          try {
            const content = fs.readFileSync(path.join(staticDir, file), 'utf8');
            if (content.includes('api/api/auth')) {
              console.log(`   ❌ ${file}: Contains problematic /api/api/ pattern`);
              this.issues.push({
                file: `build/static/js/${file}`,
                pattern: 'api/api/auth',
                type: 'build_artifact'
              });
            } else {
              console.log(`   ✅ ${file}: No problematic patterns found`);
            }
          } catch (error) {
            console.log(`   ⚠️  ${file}: Could not read file`);
          }
        }
      } else {
        console.log('   ⚠️  No static JavaScript files found');
      }
    } else {
      console.log('   ⚠️  No build directory found (may need to run npm run build)');
    }

    console.log('');
  }

  async makeRequest(path, method, data = null) {
    return new Promise((resolve) => {
      const postData = data ? JSON.stringify(data) : null;
      
      const options = {
        hostname: this.productionUrl,
        port: 443,
        path: path,
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'FloWorx-Debug-Tool/1.0'
        }
      };

      if (postData) {
        options.headers['Content-Length'] = Buffer.byteLength(postData);
      }

      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            statusMessage: res.statusMessage,
            body: body
          });
        });
      });

      req.on('error', (error) => {
        resolve({
          statusCode: 0,
          error: error.message
        });
      });

      req.setTimeout(10000, () => {
        req.destroy();
        resolve({
          statusCode: 0,
          error: 'Request timeout'
        });
      });

      if (postData) {
        req.write(postData);
      }
      
      req.end();
    });
  }

  displayResults() {
    console.log('📊 DEBUG RESULTS SUMMARY');
    console.log('=' .repeat(60));

    if (this.issues.length === 0) {
      console.log('🎉 NO CONFIGURATION ISSUES FOUND!');
      console.log('   All configuration files appear to be correct.');
      console.log('   The issue may be with build caching or deployment process.');
    } else {
      console.log(`❌ FOUND ${this.issues.length} CONFIGURATION ISSUES:`);
      
      const configIssues = this.issues.filter(i => i.type === 'configuration');
      const buildIssues = this.issues.filter(i => i.type === 'build_artifact');

      if (configIssues.length > 0) {
        console.log('\n🔧 CONFIGURATION ISSUES:');
        configIssues.forEach(issue => {
          console.log(`   • ${issue.file}: "${issue.pattern}"`);
        });
      }

      if (buildIssues.length > 0) {
        console.log('\n🏗️  BUILD ARTIFACT ISSUES:');
        buildIssues.forEach(issue => {
          console.log(`   • ${issue.file}: "${issue.pattern}"`);
        });
      }
    }

    console.log('\n🎯 RECOMMENDED ACTIONS:');
    
    if (this.issues.some(i => i.type === 'configuration')) {
      console.log('   1. Fix configuration files with problematic URLs');
      console.log('   2. Commit and push changes to trigger new build');
    }
    
    if (this.issues.some(i => i.type === 'build_artifact')) {
      console.log('   3. Clear build cache and rebuild frontend');
      console.log('   4. Force deployment system to use new build');
    }
    
    console.log('   5. Wait for deployment to complete (3-5 minutes)');
    console.log('   6. Test registration form in browser');
    console.log('   7. Verify network requests go to /api/auth/register');

    console.log('\n🔍 NEXT STEPS:');
    console.log('   • Run this script again after making fixes');
    console.log('   • Use browser dev tools to monitor network requests');
    console.log('   • Check that new JavaScript files are being served');
    console.log('   • Verify registration form works without 404 errors');
  }
}

/**
 * Main execution
 */
async function main() {
  const debugger = new APIDoublePathDebugger();
  await debugger.debugDoublePathIssue();
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Debug interrupted');
  process.exit(0);
});

// Run the debugger
if (require.main === module) {
  main().catch((error) => {
    console.error('\n💥 DEBUG ERROR:', error.message);
    process.exit(1);
  });
}
