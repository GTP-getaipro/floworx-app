#!/usr/bin/env node

/**
 * NIXPACKS COMPATIBILITY VERIFICATION
 * ===================================
 * Verifies that the application is compatible with Nixpacks auto-detection
 */

const fs = require('fs');
const path = require('path');

class NixpacksCompatibilityChecker {
  constructor() {
    this.issues = [];
    this.recommendations = [];
  }

  checkPackageJson() {
    console.log('📦 CHECKING PACKAGE.JSON COMPATIBILITY');
    console.log('======================================');

    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      
      // Check for required scripts
      const requiredScripts = ['build', 'start'];
      const missingScripts = requiredScripts.filter(script => !packageJson.scripts[script]);
      
      if (missingScripts.length > 0) {
        this.issues.push(`Missing required scripts: ${missingScripts.join(', ')}`);
      } else {
        console.log('✅ Required scripts present: build, start');
      }

      // Check build script compatibility
      const buildScript = packageJson.scripts.build;
      if (buildScript && buildScript.includes('--prefix')) {
        console.log('✅ Build script uses --prefix (Nixpacks compatible)');
      } else if (buildScript && buildScript.includes('cd ')) {
        this.issues.push('Build script uses "cd" commands (may cause issues)');
        this.recommendations.push('Use --prefix instead of cd commands');
      }

      // Check start script compatibility
      const startScript = packageJson.scripts.start;
      if (startScript && startScript.includes('--prefix')) {
        console.log('✅ Start script uses --prefix (Nixpacks compatible)');
      } else if (startScript && startScript.includes('cd ')) {
        this.issues.push('Start script uses "cd" commands (may cause issues)');
        this.recommendations.push('Use --prefix instead of cd commands');
      }

      // Check Node.js version
      if (packageJson.engines && packageJson.engines.node) {
        console.log(`✅ Node.js version specified: ${packageJson.engines.node}`);
      } else {
        this.recommendations.push('Consider specifying Node.js version in engines field');
      }

      return true;

    } catch (error) {
      this.issues.push(`Cannot read package.json: ${error.message}`);
      return false;
    }
  }

  checkProjectStructure() {
    console.log('\n🏗️  CHECKING PROJECT STRUCTURE');
    console.log('==============================');

    const requiredDirs = ['backend', 'frontend'];
    const requiredFiles = ['backend/package.json', 'frontend/package.json', 'backend/server.js'];

    requiredDirs.forEach(dir => {
      if (fs.existsSync(dir)) {
        console.log(`✅ Directory exists: ${dir}`);
      } else {
        this.issues.push(`Missing directory: ${dir}`);
      }
    });

    requiredFiles.forEach(file => {
      if (fs.existsSync(file)) {
        console.log(`✅ File exists: ${file}`);
      } else {
        this.issues.push(`Missing file: ${file}`);
      }
    });

    return this.issues.length === 0;
  }

  checkDockerfile() {
    console.log('\n🐳 CHECKING DOCKERFILE');
    console.log('======================');

    if (fs.existsSync('Dockerfile')) {
      console.log('✅ Dockerfile exists (fallback deployment method)');
      
      try {
        const dockerfile = fs.readFileSync('Dockerfile', 'utf8');
        if (dockerfile.includes('bash')) {
          console.log('✅ Dockerfile includes bash installation');
        } else {
          this.recommendations.push('Consider adding bash to Dockerfile for compatibility');
        }
      } catch (error) {
        this.issues.push(`Cannot read Dockerfile: ${error.message}`);
      }
    } else {
      this.recommendations.push('Consider adding Dockerfile as fallback deployment method');
    }

    return true;
  }

  checkForProblematicFiles() {
    console.log('\n🚫 CHECKING FOR PROBLEMATIC FILES');
    console.log('==================================');

    const problematicFiles = [
      'nixpacks.toml', // Can cause issues if misconfigured
      '.nixpacks/plan.json' // Custom plans can be problematic
    ];

    let hasProblematicFiles = false;
    problematicFiles.forEach(file => {
      if (fs.existsSync(file)) {
        console.log(`⚠️  Found potentially problematic file: ${file}`);
        this.recommendations.push(`Consider removing ${file} to use auto-detection`);
        hasProblematicFiles = true;
      }
    });

    if (!hasProblematicFiles) {
      console.log('✅ No problematic configuration files found');
      console.log('✅ Will use Nixpacks auto-detection (recommended)');
    }

    return true;
  }

  generateReport() {
    console.log('\n📊 NIXPACKS COMPATIBILITY REPORT');
    console.log('=================================');

    const hasIssues = this.issues.length > 0;
    const hasRecommendations = this.recommendations.length > 0;

    if (!hasIssues && !hasRecommendations) {
      console.log('🎉 FULLY COMPATIBLE');
      console.log('===================');
      console.log('✅ All checks passed');
      console.log('✅ Ready for Nixpacks deployment');
      console.log('✅ Auto-detection will work correctly');
      return { compatible: true, status: 'READY' };
    }

    if (hasIssues) {
      console.log('❌ ISSUES FOUND:');
      this.issues.forEach((issue, index) => {
        console.log(`${index + 1}. ${issue}`);
      });
    }

    if (hasRecommendations) {
      console.log('\n💡 RECOMMENDATIONS:');
      this.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`);
      });
    }

    const status = hasIssues ? 'NEEDS_FIXES' : 'MOSTLY_COMPATIBLE';
    return { 
      compatible: !hasIssues, 
      status,
      issues: this.issues,
      recommendations: this.recommendations
    };
  }

  async runAllChecks() {
    console.log('🔍 NIXPACKS COMPATIBILITY CHECKER');
    console.log('=================================');
    console.log('Verifying Nixpacks auto-detection compatibility...\n');

    this.checkPackageJson();
    this.checkProjectStructure();
    this.checkDockerfile();
    this.checkForProblematicFiles();

    const report = this.generateReport();

    console.log('\n🎯 DEPLOYMENT STRATEGY:');
    console.log('======================');
    console.log('1. Nixpacks will auto-detect Node.js project');
    console.log('2. Will run: npm ci (install dependencies)');
    console.log('3. Will run: npm run build (build frontend)');
    console.log('4. Will run: npm start (start backend)');
    console.log('5. Dockerfile available as fallback method');

    return report;
  }
}

// Run checks if called directly
if (require.main === module) {
  const checker = new NixpacksCompatibilityChecker();
  checker.runAllChecks()
    .then(report => {
      console.log('\n🎉 COMPATIBILITY CHECK COMPLETE!');
      process.exit(report.compatible ? 0 : 1);
    })
    .catch(console.error);
}

module.exports = NixpacksCompatibilityChecker;
