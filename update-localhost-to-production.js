/**
 * Update Localhost to Production URLs
 * Finds and updates all localhost references to production URLs
 */

const fs = require('fs');
const path = require('path');

const PRODUCTION_DOMAIN = 'https://app.floworx-iq.com';

console.log('🔄 UPDATING LOCALHOST TO PRODUCTION URLS');
console.log('='.repeat(60));

class LocalhostUpdater {
  constructor() {
    this.changes = [];
    this.errors = [];
    this.filesToUpdate = [
      // Test files that should use production
      {
        path: 'localhost-oauth-test.js',
        updates: [
          { from: 'http://localhost:5001', to: PRODUCTION_DOMAIN },
          { from: 'localhost:5001', to: 'app.floworx-iq.com' }
        ]
      },
      {
        path: 'oauth-callback-debug-test.js',
        updates: [
          { from: 'http://localhost:5001', to: PRODUCTION_DOMAIN }
        ]
      },
      {
        path: 'oauth-callback-processor-test.js',
        updates: [
          { from: 'http://localhost:5001', to: PRODUCTION_DOMAIN }
        ]
      },
      {
        path: 'oauth-redirect-diagnostic.js',
        updates: [
          { from: 'http://localhost:5001', to: PRODUCTION_DOMAIN }
        ]
      },
      {
        path: 'complete-gmail-oauth-flow-test.js',
        updates: [
          { from: 'http://localhost:5001', to: PRODUCTION_DOMAIN }
        ]
      },
      {
        path: 'complete-onboarding-oauth-integration-test.js',
        updates: [
          { from: 'http://localhost:5001', to: PRODUCTION_DOMAIN }
        ]
      },
      {
        path: 'simple-oauth-url-test.js',
        updates: [
          { from: 'http://localhost:5001', to: PRODUCTION_DOMAIN }
        ]
      },
      {
        path: 'gmail-oauth-end-to-end-test.js',
        updates: [
          { from: 'http://localhost:5001', to: PRODUCTION_DOMAIN }
        ]
      },
      {
        path: 'database-schema-fix-validation-test.js',
        updates: [
          { from: 'http://localhost:5001', to: PRODUCTION_DOMAIN }
        ]
      },
      // Frontend API client (should already be correct but double-check)
      {
        path: 'frontend/src/utils/apiClient.js',
        updates: [
          { from: 'http://localhost:3001/api', to: `${PRODUCTION_DOMAIN}/api` },
          { from: 'localhost:3001', to: 'app.floworx-iq.com' }
        ]
      },
      // Frontend hooks
      {
        path: 'frontend/src/hooks/useApi.js',
        updates: [
          { from: 'http://localhost:3001/api', to: `${PRODUCTION_DOMAIN}/api` }
        ]
      },
      {
        path: 'frontend/src/hooks/useApiRequest.js',
        updates: [
          { from: 'http://localhost:3001/api', to: `${PRODUCTION_DOMAIN}/api` }
        ]
      },
      // Test files
      {
        path: 'tests/integration/frontend-api.test.js',
        updates: [
          { from: 'http://localhost:3001/api', to: `${PRODUCTION_DOMAIN}/api` }
        ]
      },
      {
        path: 'frontend/src/test-api-endpoints.js',
        updates: [
          { from: 'http://localhost:3001/api', to: `${PRODUCTION_DOMAIN}/api` }
        ]
      }
    ];
  }

  async updateFiles() {
    console.log('📋 Updating files with localhost references...\n');

    for (const fileConfig of this.filesToUpdate) {
      await this.updateFile(fileConfig);
    }

    return {
      changes: this.changes,
      errors: this.errors
    };
  }

  async updateFile(fileConfig) {
    const filePath = path.join(__dirname, fileConfig.path);
    
    if (!fs.existsSync(filePath)) {
      console.log(`   ⚠️  ${fileConfig.path}: File not found (skipping)`);
      return;
    }

    try {
      let content = fs.readFileSync(filePath, 'utf8');
      let hasChanges = false;

      for (const update of fileConfig.updates) {
        if (content.includes(update.from)) {
          content = content.replace(new RegExp(update.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), update.to);
          hasChanges = true;
          console.log(`   ✅ ${fileConfig.path}: Updated ${update.from} → ${update.to}`);
        }
      }

      if (hasChanges) {
        fs.writeFileSync(filePath, content);
        this.changes.push(`Updated ${fileConfig.path}`);
      } else {
        console.log(`   ℹ️  ${fileConfig.path}: No localhost references found`);
      }

    } catch (error) {
      console.log(`   ❌ ${fileConfig.path}: Error updating file - ${error.message}`);
      this.errors.push(`Failed to update ${fileConfig.path}: ${error.message}`);
    }
  }

  async validateUpdates() {
    console.log('\n🔍 Validating updates...');
    
    const validationErrors = [];

    for (const fileConfig of this.filesToUpdate) {
      const filePath = path.join(__dirname, fileConfig.path);
      
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Check for remaining localhost references (excluding comments and fallbacks)
        const lines = content.split('\n');
        const problematicLines = lines
          .map((line, index) => ({ line: line.trim(), number: index + 1 }))
          .filter(({ line }) => 
            line.includes('localhost') && 
            !line.startsWith('#') && 
            !line.startsWith('//') &&
            !line.includes('fallback') &&
            !line.includes('development') &&
            !line.includes('process.env') &&
            !line.includes('||')
          );

        if (problematicLines.length > 0) {
          console.log(`   ⚠️  ${fileConfig.path}: Still contains localhost references:`);
          problematicLines.forEach(({ line, number }) => {
            console.log(`      Line ${number}: ${line}`);
          });
          validationErrors.push(`${fileConfig.path} still contains localhost references`);
        } else {
          console.log(`   ✅ ${fileConfig.path}: Clean of hardcoded localhost references`);
        }
      }
    }

    return validationErrors;
  }

  async checkEnvironmentFiles() {
    console.log('\n🔍 Checking environment files...');
    
    const envFiles = ['.env', '.env.production', 'frontend/.env', 'frontend/.env.production'];
    
    for (const envFile of envFiles) {
      const filePath = path.join(__dirname, envFile);
      
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        
        console.log(`\n📄 ${envFile}:`);
        
        // Check for API URL configuration
        const apiUrlMatch = content.match(/REACT_APP_API_URL=(.+)/);
        if (apiUrlMatch) {
          const apiUrl = apiUrlMatch[1].trim();
          if (apiUrl.includes('localhost')) {
            console.log(`   ⚠️  API URL uses localhost: ${apiUrl}`);
            console.log(`   💡 Should be: REACT_APP_API_URL=${PRODUCTION_DOMAIN}/api`);
          } else {
            console.log(`   ✅ API URL configured for production: ${apiUrl}`);
          }
        } else {
          console.log(`   ℹ️  No REACT_APP_API_URL found`);
        }

        // Check for other localhost references
        const localhostLines = content.split('\n')
          .map((line, index) => ({ line: line.trim(), number: index + 1 }))
          .filter(({ line }) => 
            line.includes('localhost') && 
            !line.startsWith('#') &&
            line.includes('=')
          );

        if (localhostLines.length > 0) {
          console.log(`   ⚠️  Contains localhost references:`);
          localhostLines.forEach(({ line, number }) => {
            console.log(`      Line ${number}: ${line}`);
          });
        }
      } else {
        console.log(`   ℹ️  ${envFile}: Not found`);
      }
    }
  }
}

// Run the localhost updater
async function main() {
  const updater = new LocalhostUpdater();
  
  try {
    // Update files
    const result = await updater.updateFiles();
    
    // Validate updates
    const validationErrors = await updater.validateUpdates();
    
    // Check environment files
    await updater.checkEnvironmentFiles();
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 UPDATE SUMMARY:');
    console.log('='.repeat(60));
    
    console.log(`✅ Files updated: ${result.changes.length}`);
    result.changes.forEach(change => console.log(`   • ${change}`));
    
    if (result.errors.length > 0) {
      console.log(`\n❌ Errors: ${result.errors.length}`);
      result.errors.forEach(error => console.log(`   • ${error}`));
    }
    
    if (validationErrors.length > 0) {
      console.log(`\n⚠️  Validation issues: ${validationErrors.length}`);
      validationErrors.forEach(error => console.log(`   • ${error}`));
    }
    
    if (result.errors.length === 0 && validationErrors.length === 0) {
      console.log('\n🎉 All localhost references updated to production URLs!');
      console.log('🚀 Ready for production deployment');
    } else {
      console.log('\n⚠️  Some issues found - please review and fix manually');
    }
    
  } catch (error) {
    console.log('\n❌ Update process failed:', error.message);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = LocalhostUpdater;
