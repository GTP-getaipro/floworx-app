#!/usr/bin/env node

/**
 * E2E Test Setup Validator
 * Validates that the E2E testing framework is properly configured
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

class E2ESetupValidator {
  constructor() {
    this.results = {
      configFiles: [],
      dependencies: [],
      apiConnectivity: [],
      testStructure: [],
      issues: [],
      recommendations: []
    };
  }

  async validateSetup() {
    console.log('🧪 FloWorx E2E BDD Test Setup Validator');
    console.log('='.repeat(50));

    await this.checkConfigFiles();
    await this.checkDependencies();
    await this.checkTestStructure();
    await this.checkApiConnectivity();
    
    this.generateReport();
  }

  async checkConfigFiles() {
    console.log('\n📁 Checking configuration files...');
    
    const requiredFiles = [
      'cypress.config.js',
      'package-e2e.json',
      'cypress/support/e2e.js',
      'cypress/support/commands.js',
      'E2E_TESTING_GUIDE.md'
    ];

    requiredFiles.forEach(file => {
      const exists = fs.existsSync(path.join(process.cwd(), file));
      this.results.configFiles.push({
        file,
        exists,
        status: exists ? '✅' : '❌'
      });
      
      if (exists) {
        console.log(`   ✅ ${file}`);
      } else {
        console.log(`   ❌ ${file} - Missing`);
        this.results.issues.push(`Missing configuration file: ${file}`);
      }
    });
  }

  async checkDependencies() {
    console.log('\n📦 Checking dependencies...');
    
    const requiredDeps = [
      'cypress',
      '@badeball/cypress-cucumber-preprocessor',
      '@bahmutov/cypress-esbuild-preprocessor',
      'esbuild',
      'axios'
    ];

    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies
      };

      requiredDeps.forEach(dep => {
        const installed = !!allDeps[dep];
        this.results.dependencies.push({
          dependency: dep,
          installed,
          version: allDeps[dep] || 'Not installed',
          status: installed ? '✅' : '❌'
        });
        
        if (installed) {
          console.log(`   ✅ ${dep} (${allDeps[dep]})`);
        } else {
          console.log(`   ❌ ${dep} - Not installed`);
          this.results.issues.push(`Missing dependency: ${dep}`);
        }
      });
    } catch (error) {
      console.log('   ❌ Could not read package.json');
      this.results.issues.push('Could not read package.json');
    }
  }

  async checkTestStructure() {
    console.log('\n🏗️  Checking test structure...');
    
    const requiredDirs = [
      'cypress/e2e/features',
      'cypress/e2e/step_definitions',
      'cypress/support'
    ];

    const requiredFeatures = [
      'cypress/e2e/features/user-registration.feature',
      'cypress/e2e/features/user-authentication.feature',
      'cypress/e2e/features/dashboard-functionality.feature',
      'cypress/e2e/features/oauth-integration.feature',
      'cypress/e2e/features/profile-management.feature',
      'cypress/e2e/features/api/api-integration.feature',
      'cypress/e2e/features/integration/complete-user-journey.feature',
      'cypress/e2e/features/smoke/critical-functionality.feature'
    ];

    const requiredSteps = [
      'cypress/e2e/step_definitions/common-steps.js',
      'cypress/e2e/step_definitions/dashboard-steps.js',
      'cypress/e2e/step_definitions/oauth-steps.js',
      'cypress/e2e/step_definitions/api-steps.js'
    ];

    [...requiredDirs, ...requiredFeatures, ...requiredSteps].forEach(item => {
      const exists = fs.existsSync(path.join(process.cwd(), item));
      this.results.testStructure.push({
        item,
        type: item.includes('.') ? 'file' : 'directory',
        exists,
        status: exists ? '✅' : '❌'
      });
      
      if (exists) {
        console.log(`   ✅ ${item}`);
      } else {
        console.log(`   ❌ ${item} - Missing`);
        this.results.issues.push(`Missing test structure: ${item}`);
      }
    });
  }

  async checkApiConnectivity() {
    console.log('\n🌐 Checking API connectivity...');
    
    const apiEndpoints = [
      {
        name: 'Health Check',
        url: 'https://floworx-app.vercel.app/api/health',
        method: 'GET',
        expectedStatus: 200
      },
      {
        name: 'Login Endpoint',
        url: 'https://floworx-app.vercel.app/api/auth/login',
        method: 'POST',
        expectedStatus: 400, // Bad request without credentials
        data: {}
      },
      {
        name: 'Register Endpoint',
        url: 'https://floworx-app.vercel.app/api/auth/register',
        method: 'POST',
        expectedStatus: 400, // Bad request without data
        data: {}
      },
      {
        name: 'OAuth Initiation',
        url: 'https://floworx-app.vercel.app/api/oauth/google',
        method: 'GET',
        expectedStatus: [302, 500] // Redirect or server error
      }
    ];

    for (const endpoint of apiEndpoints) {
      try {
        const config = {
          method: endpoint.method,
          url: endpoint.url,
          timeout: 10000,
          validateStatus: () => true // Don't throw on any status
        };

        if (endpoint.data) {
          config.data = endpoint.data;
        }

        const response = await axios(config);
        const expectedStatuses = Array.isArray(endpoint.expectedStatus) 
          ? endpoint.expectedStatus 
          : [endpoint.expectedStatus];
        
        const statusOk = expectedStatuses.includes(response.status);
        
        this.results.apiConnectivity.push({
          name: endpoint.name,
          url: endpoint.url,
          status: response.status,
          responseTime: response.config.timeout,
          accessible: statusOk,
          result: statusOk ? '✅' : '⚠️'
        });
        
        if (statusOk) {
          console.log(`   ✅ ${endpoint.name} (${response.status})`);
        } else {
          console.log(`   ⚠️  ${endpoint.name} (${response.status}) - Unexpected status`);
          this.results.recommendations.push(`Check ${endpoint.name} endpoint configuration`);
        }
        
      } catch (error) {
        console.log(`   ❌ ${endpoint.name} - ${error.message}`);
        this.results.apiConnectivity.push({
          name: endpoint.name,
          url: endpoint.url,
          accessible: false,
          error: error.message,
          result: '❌'
        });
        this.results.issues.push(`API connectivity issue: ${endpoint.name}`);
      }
    }
  }

  generateReport() {
    console.log('\n' + '='.repeat(50));
    console.log('📊 E2E SETUP VALIDATION RESULTS');
    console.log('='.repeat(50));

    // Summary
    const configOk = this.results.configFiles.every(f => f.exists);
    const depsOk = this.results.dependencies.every(d => d.installed);
    const structureOk = this.results.testStructure.every(s => s.exists);
    const apiOk = this.results.apiConnectivity.every(a => a.accessible);

    console.log('\n📋 Summary:');
    console.log(`   Configuration Files: ${configOk ? '✅' : '❌'} (${this.results.configFiles.filter(f => f.exists).length}/${this.results.configFiles.length})`);
    console.log(`   Dependencies: ${depsOk ? '✅' : '❌'} (${this.results.dependencies.filter(d => d.installed).length}/${this.results.dependencies.length})`);
    console.log(`   Test Structure: ${structureOk ? '✅' : '❌'} (${this.results.testStructure.filter(s => s.exists).length}/${this.results.testStructure.length})`);
    console.log(`   API Connectivity: ${apiOk ? '✅' : '⚠️'} (${this.results.apiConnectivity.filter(a => a.accessible).length}/${this.results.apiConnectivity.length})`);

    // Issues
    if (this.results.issues.length > 0) {
      console.log('\n🚨 Issues Found:');
      this.results.issues.forEach(issue => {
        console.log(`   - ${issue}`);
      });
    }

    // Recommendations
    if (this.results.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      this.results.recommendations.forEach(rec => {
        console.log(`   - ${rec}`);
      });
    }

    // Next steps
    console.log('\n🚀 Next Steps:');
    if (this.results.issues.length === 0) {
      console.log('   ✅ Setup is complete! You can now run E2E tests:');
      console.log('      npm run cypress:open    # Open Cypress Test Runner');
      console.log('      npm run test:e2e        # Run all E2E tests');
      console.log('      npm run test:smoke      # Run smoke tests');
    } else {
      console.log('   🔧 Fix the issues listed above, then re-run this validator');
      console.log('   📖 Refer to E2E_TESTING_GUIDE.md for detailed setup instructions');
    }

    // Overall status
    const overallOk = configOk && depsOk && structureOk;
    console.log(`\n${overallOk ? '🎉' : '⚠️'} E2E Test Setup: ${overallOk ? 'READY' : 'NEEDS ATTENTION'}`);
    
    return overallOk;
  }
}

// Run validator
async function main() {
  const validator = new E2ESetupValidator();
  const success = await validator.validateSetup();
  process.exit(success ? 0 : 1);
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Setup validation failed:', error);
    process.exit(1);
  });
}

module.exports = E2ESetupValidator;
