#!/usr/bin/env node

/**
 * DEPLOYMENT BUILD TEST
 * ====================
 * Tests the build process to ensure Coolify deployment will work
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class DeploymentBuildTest {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      tests: {},
      overall: {}
    };
  }

  async runCommand(command, args = [], options = {}) {
    return new Promise((resolve, reject) => {
      console.log(`🔧 Running: ${command} ${args.join(' ')}`);
      
      const process = spawn(command, args, {
        stdio: 'pipe',
        shell: true,
        ...options
      });

      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
        // Show real-time output for build commands
        if (command === 'npm' && (args.includes('build') || args.includes('install'))) {
          process.stdout.write(data);
        }
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
        if (command === 'npm' && (args.includes('build') || args.includes('install'))) {
          process.stderr.write(data);
        }
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
        reject(error);
      });
    });
  }

  async testFrontendDependencies() {
    console.log('\n1️⃣ TESTING FRONTEND DEPENDENCIES');
    console.log('=================================');

    try {
      const result = await this.runCommand('npm', ['install'], { cwd: './frontend' });
      
      this.results.tests.frontendDeps = {
        success: result.success,
        message: result.success ? '✅ Frontend dependencies installed' : '❌ Frontend dependency installation failed',
        details: {
          exitCode: result.code,
          hasNodeModules: fs.existsSync('./frontend/node_modules')
        }
      };

      console.log(this.results.tests.frontendDeps.message);
      return result.success;

    } catch (error) {
      this.results.tests.frontendDeps = {
        success: false,
        message: `❌ Frontend dependency test failed: ${error.message}`,
        error: error.message
      };
      console.log(this.results.tests.frontendDeps.message);
      return false;
    }
  }

  async testFrontendBuild() {
    console.log('\n2️⃣ TESTING FRONTEND BUILD');
    console.log('==========================');

    try {
      // Clean previous build
      if (fs.existsSync('./frontend/build')) {
        fs.rmSync('./frontend/build', { recursive: true, force: true });
      }

      const result = await this.runCommand('npm', ['run', 'build'], { cwd: './frontend' });
      
      const buildExists = fs.existsSync('./frontend/build');
      const indexExists = fs.existsSync('./frontend/build/index.html');
      const staticExists = fs.existsSync('./frontend/build/static');

      this.results.tests.frontendBuild = {
        success: result.success && buildExists && indexExists,
        message: result.success && buildExists && indexExists 
          ? '✅ Frontend build successful' 
          : '❌ Frontend build failed',
        details: {
          exitCode: result.code,
          buildExists,
          indexExists,
          staticExists,
          buildSize: buildExists ? this.getFolderSize('./frontend/build') : 0
        }
      };

      console.log(this.results.tests.frontendBuild.message);
      if (buildExists) {
        console.log(`📦 Build size: ${(this.results.tests.frontendBuild.details.buildSize / 1024 / 1024).toFixed(2)} MB`);
      }

      return this.results.tests.frontendBuild.success;

    } catch (error) {
      this.results.tests.frontendBuild = {
        success: false,
        message: `❌ Frontend build test failed: ${error.message}`,
        error: error.message
      };
      console.log(this.results.tests.frontendBuild.message);
      return false;
    }
  }

  async testBackendDependencies() {
    console.log('\n3️⃣ TESTING BACKEND DEPENDENCIES');
    console.log('================================');

    try {
      const result = await this.runCommand('npm', ['install'], { cwd: './backend' });
      
      this.results.tests.backendDeps = {
        success: result.success,
        message: result.success ? '✅ Backend dependencies installed' : '❌ Backend dependency installation failed',
        details: {
          exitCode: result.code,
          hasNodeModules: fs.existsSync('./backend/node_modules')
        }
      };

      console.log(this.results.tests.backendDeps.message);
      return result.success;

    } catch (error) {
      this.results.tests.backendDeps = {
        success: false,
        message: `❌ Backend dependency test failed: ${error.message}`,
        error: error.message
      };
      console.log(this.results.tests.backendDeps.message);
      return false;
    }
  }

  async testRootBuildScript() {
    console.log('\n4️⃣ TESTING ROOT BUILD SCRIPT');
    console.log('=============================');

    try {
      // Clean previous build
      if (fs.existsSync('./frontend/build')) {
        fs.rmSync('./frontend/build', { recursive: true, force: true });
      }

      const result = await this.runCommand('npm', ['run', 'build']);
      
      const buildExists = fs.existsSync('./frontend/build');
      const indexExists = fs.existsSync('./frontend/build/index.html');

      this.results.tests.rootBuild = {
        success: result.success && buildExists && indexExists,
        message: result.success && buildExists && indexExists 
          ? '✅ Root build script successful (Coolify compatible)' 
          : '❌ Root build script failed',
        details: {
          exitCode: result.code,
          buildExists,
          indexExists,
          command: 'npm run build'
        }
      };

      console.log(this.results.tests.rootBuild.message);
      return this.results.tests.rootBuild.success;

    } catch (error) {
      this.results.tests.rootBuild = {
        success: false,
        message: `❌ Root build script test failed: ${error.message}`,
        error: error.message
      };
      console.log(this.results.tests.rootBuild.message);
      return false;
    }
  }

  getFolderSize(folderPath) {
    let totalSize = 0;
    
    function calculateSize(dirPath) {
      const files = fs.readdirSync(dirPath);
      
      files.forEach(file => {
        const filePath = path.join(dirPath, file);
        const stats = fs.statSync(filePath);
        
        if (stats.isDirectory()) {
          calculateSize(filePath);
        } else {
          totalSize += stats.size;
        }
      });
    }
    
    if (fs.existsSync(folderPath)) {
      calculateSize(folderPath);
    }
    
    return totalSize;
  }

  async runAllTests() {
    console.log('🧪 DEPLOYMENT BUILD TEST SUITE');
    console.log('===============================');
    console.log('Testing build process for Coolify deployment compatibility');

    const testResults = [
      await this.testFrontendDependencies(),
      await this.testFrontendBuild(),
      await this.testBackendDependencies(),
      await this.testRootBuildScript()
    ];

    const passedTests = testResults.filter(Boolean).length;
    const totalTests = testResults.length;

    this.results.overall = {
      passedTests,
      totalTests,
      successRate: ((passedTests / totalTests) * 100).toFixed(1),
      status: passedTests === totalTests ? 'READY_FOR_DEPLOYMENT' : 'NEEDS_FIXES',
      coolifyCompatible: this.results.tests.rootBuild?.success || false
    };

    console.log('\n📊 DEPLOYMENT BUILD TEST RESULTS');
    console.log('=================================');
    console.log(`✅ Passed: ${passedTests}/${totalTests} tests`);
    console.log(`📈 Success Rate: ${this.results.overall.successRate}%`);
    console.log(`🎯 Status: ${this.results.overall.status}`);
    console.log(`🚀 Coolify Compatible: ${this.results.overall.coolifyCompatible ? '✅ YES' : '❌ NO'}`);

    if (this.results.overall.coolifyCompatible) {
      console.log('\n🎉 DEPLOYMENT READY!');
      console.log('====================');
      console.log('✅ Build scripts are Coolify compatible');
      console.log('✅ Frontend builds successfully');
      console.log('✅ Dependencies install correctly');
      console.log('🚀 Ready for production deployment!');
    } else {
      console.log('\n⚠️  DEPLOYMENT ISSUES FOUND');
      console.log('============================');
      Object.entries(this.results.tests).forEach(([test, result]) => {
        if (!result.success) {
          console.log(`❌ ${test}: ${result.message}`);
        }
      });
    }

    // Save detailed results
    fs.writeFileSync('deployment-build-test-results.json', JSON.stringify(this.results, null, 2));
    console.log('\n📄 Detailed results saved to: deployment-build-test-results.json');

    return this.results;
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new DeploymentBuildTest();
  tester.runAllTests()
    .then(results => {
      process.exit(results.overall.status === 'READY_FOR_DEPLOYMENT' ? 0 : 1);
    })
    .catch(console.error);
}

module.exports = DeploymentBuildTest;
