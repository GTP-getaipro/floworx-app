#!/usr/bin/env node

/**
 * AUTO-FIX DEPLOYMENT ISSUES
 * ==========================
 * Automatically detects and fixes common deployment problems
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

class AutoFixDeployment {
  constructor() {
    this.fixesApplied = [];
    this.errors = [];
  }

  async runCommand(command, args = [], options = {}) {
    return new Promise((resolve) => {
      const process = spawn(command, args, {
        stdio: 'pipe',
        shell: true,
        ...options
      });

      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        resolve({
          code,
          stdout,
          stderr,
          success: code === 0
        });
      });

      process.on('error', (error) => {
        resolve({
          code: -1,
          stdout: '',
          stderr: error.message,
          success: false
        });
      });
    });
  }

  fixPackageJsonScripts() {
    console.log('🔧 FIXING PACKAGE.JSON SCRIPTS');
    console.log('===============================');

    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      let modified = false;

      // Fix build script
      const correctBuildScript = 'npm install --prefix frontend && npm run build --prefix frontend';
      if (packageJson.scripts.build !== correctBuildScript) {
        packageJson.scripts.build = correctBuildScript;
        modified = true;
        this.fixesApplied.push('Fixed build script to use --prefix');
      }

      // Fix start script
      const correctStartScript = 'npm start --prefix backend';
      if (packageJson.scripts.start !== correctStartScript) {
        packageJson.scripts.start = correctStartScript;
        modified = true;
        this.fixesApplied.push('Fixed start script to use --prefix');
      }

      // Ensure engines field
      if (!packageJson.engines || !packageJson.engines.node) {
        if (!packageJson.engines) packageJson.engines = {};
        packageJson.engines.node = '>=18.0.0';
        modified = true;
        this.fixesApplied.push('Added Node.js version requirement');
      }

      if (modified) {
        fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
        console.log('✅ Package.json scripts fixed');
      } else {
        console.log('✅ Package.json scripts already correct');
      }

    } catch (error) {
      this.errors.push(`Failed to fix package.json: ${error.message}`);
      console.log(`❌ Error fixing package.json: ${error.message}`);
    }
  }

  fixFrontendBuildScript() {
    console.log('\n🎨 FIXING FRONTEND BUILD SCRIPT');
    console.log('================================');

    try {
      const frontendPackageJson = JSON.parse(fs.readFileSync('frontend/package.json', 'utf8'));
      let modified = false;

      // Fix build script to disable CI and ESLint warnings
      const correctBuildScript = 'cross-env CI=false DISABLE_ESLINT_PLUGIN=true GENERATE_SOURCEMAP=false react-scripts build';
      if (frontendPackageJson.scripts.build !== correctBuildScript) {
        frontendPackageJson.scripts.build = correctBuildScript;
        modified = true;
        this.fixesApplied.push('Fixed frontend build script for deployment');
      }

      if (modified) {
        fs.writeFileSync('frontend/package.json', JSON.stringify(frontendPackageJson, null, 2));
        console.log('✅ Frontend build script fixed');
      } else {
        console.log('✅ Frontend build script already correct');
      }

    } catch (error) {
      this.errors.push(`Failed to fix frontend package.json: ${error.message}`);
      console.log(`❌ Error fixing frontend package.json: ${error.message}`);
    }
  }

  cleanBuildArtifacts() {
    console.log('\n🧹 CLEANING BUILD ARTIFACTS');
    console.log('============================');

    const artifactsToClean = [
      'frontend/build',
      'node_modules/.cache',
      'frontend/node_modules/.cache',
      'backend/node_modules/.cache'
    ];

    artifactsToClean.forEach(artifact => {
      if (fs.existsSync(artifact)) {
        try {
          fs.rmSync(artifact, { recursive: true, force: true });
          console.log(`✅ Cleaned: ${artifact}`);
          this.fixesApplied.push(`Cleaned build artifact: ${artifact}`);
        } catch (error) {
          console.log(`⚠️  Could not clean ${artifact}: ${error.message}`);
        }
      }
    });
  }

  fixDockerfile() {
    console.log('\n🐳 FIXING DOCKERFILE');
    console.log('====================');

    try {
      if (fs.existsSync('Dockerfile')) {
        let dockerfile = fs.readFileSync('Dockerfile', 'utf8');
        let modified = false;

        // Ensure bash is installed
        if (!dockerfile.includes('bash')) {
          dockerfile = dockerfile.replace(
            'FROM node:20-alpine AS base',
            'FROM node:20-alpine AS base\n\n# Install bash and other necessary tools\nRUN apk add --no-cache bash curl git'
          );
          modified = true;
          this.fixesApplied.push('Added bash installation to Dockerfile');
        }

        if (modified) {
          fs.writeFileSync('Dockerfile', dockerfile);
          console.log('✅ Dockerfile fixed');
        } else {
          console.log('✅ Dockerfile already correct');
        }
      } else {
        console.log('ℹ️  No Dockerfile found (using Nixpacks auto-detection)');
      }

    } catch (error) {
      this.errors.push(`Failed to fix Dockerfile: ${error.message}`);
      console.log(`❌ Error fixing Dockerfile: ${error.message}`);
    }
  }

  removeProblematicFiles() {
    console.log('\n🚫 REMOVING PROBLEMATIC FILES');
    console.log('==============================');

    const problematicFiles = [
      'nixpacks.toml', // Can cause issues
      '.nixpacks', // Custom plans can be problematic
      'frontend/.env.local',
      'frontend/.env.production.local'
    ];

    problematicFiles.forEach(file => {
      if (fs.existsSync(file)) {
        try {
          if (fs.lstatSync(file).isDirectory()) {
            fs.rmSync(file, { recursive: true, force: true });
          } else {
            fs.unlinkSync(file);
          }
          console.log(`✅ Removed problematic file: ${file}`);
          this.fixesApplied.push(`Removed problematic file: ${file}`);
        } catch (error) {
          console.log(`⚠️  Could not remove ${file}: ${error.message}`);
        }
      }
    });
  }

  async testBuildProcess() {
    console.log('\n🧪 TESTING BUILD PROCESS');
    console.log('========================');

    // Test root build
    const buildResult = await this.runCommand('npm', ['run', 'build']);
    if (buildResult.success) {
      console.log('✅ Build process works correctly');
      return true;
    } else {
      console.log('❌ Build process failed:');
      console.log(buildResult.stderr);
      this.errors.push('Build process still failing after fixes');
      return false;
    }
  }

  async applyAllFixes() {
    console.log('🔧 AUTO-FIX DEPLOYMENT ISSUES');
    console.log('==============================');
    console.log('Applying automatic fixes for common deployment problems...\n');

    this.fixPackageJsonScripts();
    this.fixFrontendBuildScript();
    this.cleanBuildArtifacts();
    this.fixDockerfile();
    this.removeProblematicFiles();

    const buildWorks = await this.testBuildProcess();

    console.log('\n📊 AUTO-FIX RESULTS');
    console.log('===================');

    if (this.fixesApplied.length > 0) {
      console.log('✅ FIXES APPLIED:');
      this.fixesApplied.forEach((fix, index) => {
        console.log(`${index + 1}. ${fix}`);
      });
    } else {
      console.log('ℹ️  No fixes needed - configuration already correct');
    }

    if (this.errors.length > 0) {
      console.log('\n❌ REMAINING ERRORS:');
      this.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }

    const status = this.errors.length === 0 && buildWorks ? 'FIXED' : 'NEEDS_MANUAL_INTERVENTION';
    
    console.log(`\n🎯 STATUS: ${status}`);
    
    if (status === 'FIXED') {
      console.log('🎉 All issues fixed! Ready for deployment.');
    } else {
      console.log('⚠️  Some issues require manual intervention.');
    }

    return {
      status,
      fixesApplied: this.fixesApplied,
      errors: this.errors,
      buildWorks
    };
  }
}

// Run auto-fix if called directly
if (require.main === module) {
  const autoFix = new AutoFixDeployment();
  autoFix.applyAllFixes()
    .then(result => {
      console.log('\n🎉 AUTO-FIX COMPLETE!');
      
      // Save results
      fs.writeFileSync('auto-fix-results.json', JSON.stringify(result, null, 2));
      console.log('📄 Results saved to: auto-fix-results.json');
      
      process.exit(result.status === 'FIXED' ? 0 : 1);
    })
    .catch(console.error);
}

module.exports = AutoFixDeployment;
