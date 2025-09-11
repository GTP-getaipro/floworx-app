#!/usr/bin/env node

/**
 * DEPLOYMENT ISSUE DIAGNOSTICS
 * ============================
 * Diagnose and fix the CSS chunk loading and static asset issues
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

class DeploymentDiagnostics {
  constructor(baseUrl = 'https://app.floworx-iq.com') {
    this.baseUrl = baseUrl;
    this.apiUrl = `${baseUrl}/api`;
    this.issues = [];
    this.fixes = [];
  }

  async checkStaticAssets() {
    console.log('🔍 CHECKING STATIC ASSET AVAILABILITY');
    console.log('====================================');

    const staticAssets = [
      '/static/css/main.css',
      '/static/js/main.js',
      '/static/css/679.6b0c9db3.chunk.css', // The failing CSS chunk from error
      '/static/js/679.6b0c9db3.chunk.js',
      '/manifest.json',
      '/favicon.ico'
    ];

    const assetResults = [];

    for (const asset of staticAssets) {
      try {
        console.log(`🧪 Testing: ${asset}`);
        const response = await axios.get(`${this.baseUrl}${asset}`, {
          timeout: 10000,
          validateStatus: () => true // Don't throw on 404
        });

        const result = {
          asset,
          status: response.status,
          contentType: response.headers['content-type'],
          size: response.headers['content-length'],
          success: response.status === 200
        };

        assetResults.push(result);

        if (response.status === 200) {
          console.log(`   ✅ ${asset}: ${response.status} (${response.headers['content-type']})`);
        } else {
          console.log(`   ❌ ${asset}: ${response.status}`);
          
          // Check if we're getting HTML instead of the asset (404 page)
          if (response.headers['content-type']?.includes('text/html')) {
            console.log(`   🚨 ISSUE: Getting HTML instead of asset (404 page served)`);
            this.issues.push({
              type: 'STATIC_ASSET_404',
              asset,
              description: 'Static asset returning HTML (404 page) instead of actual file'
            });
          }
        }

      } catch (error) {
        console.log(`   ❌ ${asset}: ERROR - ${error.message}`);
        assetResults.push({
          asset,
          success: false,
          error: error.message
        });
      }
    }

    return assetResults;
  }

  async checkFrontendBuild() {
    console.log('\n🏗️ CHECKING FRONTEND BUILD STATUS');
    console.log('=================================');

    const buildChecks = [];

    // Check if build directory exists
    const buildDir = path.join(__dirname, 'frontend', 'build');
    const buildExists = fs.existsSync(buildDir);
    
    console.log(`📁 Build directory exists: ${buildExists}`);
    buildChecks.push({ check: 'Build Directory', exists: buildExists });

    if (buildExists) {
      // Check key build files
      const keyFiles = [
        'index.html',
        'static/css',
        'static/js',
        'manifest.json'
      ];

      for (const file of keyFiles) {
        const filePath = path.join(buildDir, file);
        const exists = fs.existsSync(filePath);
        console.log(`📄 ${file}: ${exists ? '✅' : '❌'}`);
        buildChecks.push({ check: file, exists });

        if (!exists) {
          this.issues.push({
            type: 'MISSING_BUILD_FILE',
            file,
            description: `Required build file missing: ${file}`
          });
        }
      }

      // Check for chunk files specifically
      const staticJsDir = path.join(buildDir, 'static', 'js');
      const staticCssDir = path.join(buildDir, 'static', 'css');

      if (fs.existsSync(staticJsDir)) {
        const jsFiles = fs.readdirSync(staticJsDir);
        console.log(`📊 JS chunks found: ${jsFiles.length}`);
        console.log(`   Files: ${jsFiles.slice(0, 3).join(', ')}${jsFiles.length > 3 ? '...' : ''}`);
      }

      if (fs.existsSync(staticCssDir)) {
        const cssFiles = fs.readdirSync(staticCssDir);
        console.log(`📊 CSS chunks found: ${cssFiles.length}`);
        console.log(`   Files: ${cssFiles.slice(0, 3).join(', ')}${cssFiles.length > 3 ? '...' : ''}`);
      }

    } else {
      this.issues.push({
        type: 'NO_BUILD_DIRECTORY',
        description: 'Frontend build directory does not exist'
      });
    }

    return buildChecks;
  }

  async checkServerConfiguration() {
    console.log('\n🖥️ CHECKING SERVER CONFIGURATION');
    console.log('================================');

    const configChecks = [];

    try {
      // Test API health
      const healthResponse = await axios.get(`${this.apiUrl}/health`);
      console.log(`✅ API Health: ${healthResponse.status}`);
      configChecks.push({ check: 'API Health', status: healthResponse.status, success: true });

      // Test static file serving by checking a known static file
      const indexResponse = await axios.get(`${this.baseUrl}/`, {
        headers: { 'Accept': 'text/html' }
      });
      
      console.log(`📄 Index page: ${indexResponse.status}`);
      console.log(`   Content-Type: ${indexResponse.headers['content-type']}`);
      
      // Check if we're getting the React app or a server error
      const isReactApp = indexResponse.data.includes('id="root"') || indexResponse.data.includes('FloWorx');
      console.log(`   React app detected: ${isReactApp}`);
      
      configChecks.push({ 
        check: 'Index Page', 
        status: indexResponse.status, 
        isReactApp,
        success: indexResponse.status === 200 && isReactApp 
      });

      if (!isReactApp) {
        this.issues.push({
          type: 'REACT_APP_NOT_SERVED',
          description: 'Index page is not serving the React application'
        });
      }

    } catch (error) {
      console.log(`❌ Server check failed: ${error.message}`);
      configChecks.push({ check: 'Server Configuration', success: false, error: error.message });
      
      this.issues.push({
        type: 'SERVER_UNREACHABLE',
        description: `Server configuration issue: ${error.message}`
      });
    }

    return configChecks;
  }

  async generateFixes() {
    console.log('\n🔧 GENERATING FIXES FOR IDENTIFIED ISSUES');
    console.log('=========================================');

    for (const issue of this.issues) {
      switch (issue.type) {
        case 'STATIC_ASSET_404':
          this.fixes.push({
            issue: issue.type,
            description: 'Static assets returning 404 - build/deployment mismatch',
            commands: [
              'cd frontend && npm run build',
              'Check Dockerfile COPY commands for frontend/build',
              'Verify server.js static file serving configuration'
            ],
            priority: 'HIGH'
          });
          break;

        case 'NO_BUILD_DIRECTORY':
          this.fixes.push({
            issue: issue.type,
            description: 'Frontend not built - run build process',
            commands: [
              'cd frontend && npm install',
              'cd frontend && npm run build',
              'Verify build directory created with static assets'
            ],
            priority: 'CRITICAL'
          });
          break;

        case 'MISSING_BUILD_FILE':
          this.fixes.push({
            issue: issue.type,
            description: `Missing build file: ${issue.file}`,
            commands: [
              'cd frontend && rm -rf build node_modules',
              'cd frontend && npm install',
              'cd frontend && npm run build'
            ],
            priority: 'HIGH'
          });
          break;

        case 'REACT_APP_NOT_SERVED':
          this.fixes.push({
            issue: issue.type,
            description: 'Server not serving React app correctly',
            commands: [
              'Check backend/server.js static file configuration',
              'Verify frontend/build directory is copied in Dockerfile',
              'Check Express static middleware setup'
            ],
            priority: 'HIGH'
          });
          break;

        case 'SERVER_UNREACHABLE':
          this.fixes.push({
            issue: issue.type,
            description: 'Server configuration or deployment issue',
            commands: [
              'Check deployment logs',
              'Verify environment variables',
              'Check Docker container status'
            ],
            priority: 'CRITICAL'
          });
          break;
      }
    }

    // Display fixes
    if (this.fixes.length > 0) {
      console.log('\n🎯 RECOMMENDED FIXES:');
      this.fixes.forEach((fix, index) => {
        console.log(`\n${index + 1}. ${fix.issue} (${fix.priority} PRIORITY)`);
        console.log(`   Description: ${fix.description}`);
        console.log(`   Commands:`);
        fix.commands.forEach(cmd => console.log(`     • ${cmd}`));
      });
    } else {
      console.log('✅ No issues detected that require fixes');
    }
  }

  async createQuickFix() {
    console.log('\n⚡ CREATING QUICK FIX SCRIPT');
    console.log('============================');

    const quickFixScript = `#!/bin/bash

# QUICK FIX FOR FLOWORX DEPLOYMENT ISSUES
# =======================================

echo "🔧 FloWorx Deployment Quick Fix"
echo "==============================="

# Step 1: Clean and rebuild frontend
echo "📦 Step 1: Rebuilding frontend..."
cd frontend
rm -rf build node_modules package-lock.json
npm install
npm run build

if [ ! -d "build" ]; then
  echo "❌ Frontend build failed!"
  exit 1
fi

echo "✅ Frontend build completed"

# Step 2: Check build contents
echo "📊 Step 2: Verifying build contents..."
ls -la build/
ls -la build/static/

# Step 3: Test local serving (optional)
echo "🧪 Step 3: Testing build locally..."
cd ..
node -e "
const express = require('express');
const path = require('path');
const app = express();
app.use(express.static(path.join(__dirname, 'frontend/build')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/build/index.html'));
});
const server = app.listen(3001, () => {
  console.log('✅ Local test server running on http://localhost:3001');
  console.log('🔍 Test the app, then press Ctrl+C to continue');
});
"

echo "🎉 Quick fix completed!"
echo "📋 Next steps:"
echo "   1. Commit and push changes"
echo "   2. Wait 3 minutes for deployment"
echo "   3. Test the application"
`;

    fs.writeFileSync('quick-fix-deployment.sh', quickFixScript);
    console.log('✅ Quick fix script saved to: quick-fix-deployment.sh');
    console.log('📋 Run with: chmod +x quick-fix-deployment.sh && ./quick-fix-deployment.sh');
  }

  async runDiagnostics() {
    console.log('🔍 FLOWORX DEPLOYMENT DIAGNOSTICS');
    console.log('=================================');
    console.log(`🌐 Target: ${this.baseUrl}`);
    console.log(`⏰ Started: ${new Date().toISOString()}\n`);

    // Run all diagnostic checks
    const staticAssetResults = await this.checkStaticAssets();
    const buildResults = await this.checkFrontendBuild();
    const serverResults = await this.checkServerConfiguration();

    // Generate fixes based on issues found
    await this.generateFixes();

    // Create quick fix script
    await this.createQuickFix();

    // Summary
    console.log('\n📊 DIAGNOSTIC SUMMARY');
    console.log('====================');
    console.log(`Issues found: ${this.issues.length}`);
    console.log(`Fixes generated: ${this.fixes.length}`);

    const criticalIssues = this.issues.filter(issue => 
      ['NO_BUILD_DIRECTORY', 'SERVER_UNREACHABLE'].includes(issue.type)
    );
    
    if (criticalIssues.length > 0) {
      console.log('🚨 CRITICAL ISSUES DETECTED:');
      criticalIssues.forEach(issue => {
        console.log(`   • ${issue.type}: ${issue.description}`);
      });
    }

    // Save diagnostic report
    const report = {
      timestamp: new Date().toISOString(),
      baseUrl: this.baseUrl,
      staticAssetResults,
      buildResults,
      serverResults,
      issues: this.issues,
      fixes: this.fixes
    };

    const reportFile = `deployment-diagnostics-${Date.now()}.json`;
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    console.log(`\n📄 Diagnostic report saved to: ${reportFile}`);

    console.log('\n🎯 NEXT STEPS:');
    if (this.issues.length === 0) {
      console.log('✅ No issues detected - deployment appears healthy');
    } else {
      console.log('🔧 Run the quick fix script to resolve issues:');
      console.log('   chmod +x quick-fix-deployment.sh && ./quick-fix-deployment.sh');
    }

    console.log('\n🔍 DEPLOYMENT DIAGNOSTICS COMPLETE!');

    return report;
  }
}

// Run diagnostics if called directly
if (require.main === module) {
  const diagnostics = new DeploymentDiagnostics();
  diagnostics.runDiagnostics()
    .then(report => {
      const hasIssues = report.issues.length > 0;
      process.exit(hasIssues ? 1 : 0);
    })
    .catch(console.error);
}

module.exports = DeploymentDiagnostics;
